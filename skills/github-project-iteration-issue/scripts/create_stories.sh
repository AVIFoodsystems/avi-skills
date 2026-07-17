#!/usr/bin/env bash
set -euo pipefail

# ---------- Inputs ----------
ISSUE_TITLE="${ISSUE_TITLE:-}"
ISSUE_BODY="${ISSUE_BODY:-}"
ISSUE_BODY_FILE="${ISSUE_BODY_FILE:-}"
OWNER="${OWNER:-AVIFoodsystems}"
REPO="${REPO:-}"
PROJECT_NUMBER="${PROJECT_NUMBER:-}"
ITERATION_TITLE="${ITERATION_TITLE:-}"
LABELS="${LABELS:-}"
# Always applied in addition to LABELS; never replaced.
MANDATORY_LABELS="backlog,needs triage"

usage() {
  cat <<'USAGE'
Usage: create_stories.sh [options]

Required:
  --title "..."             Issue title (or set ISSUE_TITLE env var)
  --body "..." | --body-file <path|->
                            Issue body text, file path, or "-" for stdin
  --repo <repo>             Repo name (or REPO env var)
  --project <number>        Project number (or PROJECT_NUMBER env var)
  --iteration "<title>"     Iteration title (or ITERATION_TITLE env var)

Optional:
  --owner <owner>           Repo owner (default: AVIFoodsystems)
  --labels "a,b"            Extra comma-separated labels; "backlog" and
                            "needs triage" are always added
  -h, --help                Show help

Env vars override defaults; CLI options override env vars.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      [[ $# -lt 2 ]] && { echo "Missing value for --title"; exit 1; }
      ISSUE_TITLE="$2"
      shift 2
      ;;
    --body)
      [[ $# -lt 2 ]] && { echo "Missing value for --body"; exit 1; }
      ISSUE_BODY="$2"
      ISSUE_BODY_FILE=""
      shift 2
      ;;
    --body-file)
      [[ $# -lt 2 ]] && { echo "Missing value for --body-file"; exit 1; }
      ISSUE_BODY_FILE="$2"
      ISSUE_BODY=""
      shift 2
      ;;
    --owner)
      [[ $# -lt 2 ]] && { echo "Missing value for --owner"; exit 1; }
      OWNER="$2"
      shift 2
      ;;
    --repo)
      [[ $# -lt 2 ]] && { echo "Missing value for --repo"; exit 1; }
      REPO="$2"
      shift 2
      ;;
    --project)
      [[ $# -lt 2 ]] && { echo "Missing value for --project"; exit 1; }
      PROJECT_NUMBER="$2"
      shift 2
      ;;
    --iteration)
      [[ $# -lt 2 ]] && { echo "Missing value for --iteration"; exit 1; }
      ITERATION_TITLE="$2"
      shift 2
      ;;
    --labels)
      [[ $# -lt 2 ]] && { echo "Missing value for --labels"; exit 1; }
      LABELS="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

MISSING=""
[[ -z "$ISSUE_TITLE" ]] && MISSING+=" --title"
[[ -z "$REPO" ]] && MISSING+=" --repo"
[[ -z "$PROJECT_NUMBER" ]] && MISSING+=" --project"
[[ -z "$ITERATION_TITLE" ]] && MISSING+=" --iteration"
[[ -z "$ISSUE_BODY" && -z "$ISSUE_BODY_FILE" ]] && MISSING+=" --body/--body-file"
if [[ -n "$MISSING" ]]; then
  echo "Missing required arguments:$MISSING"
  usage
  exit 1
fi

# ---------- 1: Build the issue body ----------
BODY_FILE=""
TMP_BODY_FILE=""
cleanup() { [[ -n "$TMP_BODY_FILE" ]] && rm -f "$TMP_BODY_FILE"; }
trap cleanup EXIT
if [[ -n "$ISSUE_BODY_FILE" ]]; then
  if [[ "$ISSUE_BODY_FILE" == "-" ]]; then
    TMP_BODY_FILE=$(mktemp -t issue-body.XXXXXX)
    BODY_FILE="$TMP_BODY_FILE"
    cat > "$BODY_FILE"
  elif [[ -f "$ISSUE_BODY_FILE" ]]; then
    BODY_FILE="$ISSUE_BODY_FILE"
  else
    echo "Body file not found: $ISSUE_BODY_FILE"
    exit 1
  fi
else
  TMP_BODY_FILE=$(mktemp -t issue-body.XXXXXX)
  BODY_FILE="$TMP_BODY_FILE"
  printf '%s\n' "$ISSUE_BODY" > "$BODY_FILE"
fi

# ---------- 2: Create the issue ----------
ALL_LABELS="$MANDATORY_LABELS${LABELS:+,$LABELS}"
ISSUE_CREATE_OUTPUT=$(gh issue create \
  --repo "$OWNER/$REPO" \
  --title "$ISSUE_TITLE" \
  --body-file "$BODY_FILE" \
  --label "$ALL_LABELS" 2>&1)
printf '%s\n' "$ISSUE_CREATE_OUTPUT"

ISSUE_URL=$(printf '%s\n' "$ISSUE_CREATE_OUTPUT" | grep -Eo 'https://github.com/[^ ]+/issues/[0-9]+' | tail -n 1 || true)
if [[ -z "$ISSUE_URL" ]]; then
  echo "Failed to parse issue URL from gh output."
  exit 1
fi

ISSUE_NUMBER="${ISSUE_URL##*/}"

# ---------- 3️⃣  Add to Project #3 and set Iteration ----------
ITEM_ID=$(gh project item-add "$PROJECT_NUMBER" \
  --owner "$OWNER" \
  --url "$ISSUE_URL" \
  --format json \
  --jq '.id')

PROJECT_ID=$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json --jq '.id')

OWNER_TYPE=$(gh api "users/$OWNER" --jq .type)
if [[ -z "$OWNER_TYPE" || "$OWNER_TYPE" == "null" ]]; then
  echo "Owner \"$OWNER\" not found."
  exit 1
fi

if [[ "$OWNER_TYPE" == "Organization" ]]; then
  ITERATION_DATA=$(gh api graphql -f query='
    query($owner:String!, $number:Int!) {
      organization(login: $owner) {
        projectV2(number: $number) {
          fields(first: 50) {
            nodes {
              ... on ProjectV2IterationField {
                id
                name
                configuration {
                  iterations {
                    id
                    title
                    startDate
                  }
                }
              }
            }
          }
        }
      }
    }' -F owner="$OWNER" -F number="$PROJECT_NUMBER")
  FIELD_PATH='.data.organization.projectV2.fields.nodes'
elif [[ "$OWNER_TYPE" == "User" ]]; then
  ITERATION_DATA=$(gh api graphql -f query='
    query($owner:String!, $number:Int!) {
      user(login: $owner) {
        projectV2(number: $number) {
          fields(first: 50) {
            nodes {
              ... on ProjectV2IterationField {
                id
                name
                configuration {
                  iterations {
                    id
                    title
                    startDate
                  }
                }
              }
            }
          }
        }
      }
    }' -F owner="$OWNER" -F number="$PROJECT_NUMBER")
  FIELD_PATH='.data.user.projectV2.fields.nodes'
else
  echo "Unsupported owner type: $OWNER_TYPE"
  exit 1
fi

ITERATION_FIELD_ID=$(jq -r \
  "$FIELD_PATH | .[] | select(.name==\"Iteration\") | .id" <<<"$ITERATION_DATA")

ITERATION_ID=$(jq -r --arg title "$ITERATION_TITLE" \
  "$FIELD_PATH | .[] | select(.name==\"Iteration\") | .configuration.iterations[] | select(.title==\$title) | .id" <<<"$ITERATION_DATA")

if [[ -z "$ITERATION_FIELD_ID" || "$ITERATION_FIELD_ID" == "null" ]]; then
  echo "Iteration field not found in Project #$PROJECT_NUMBER."
  exit 1
fi

if [[ -z "$ITERATION_ID" || "$ITERATION_ID" == "null" ]]; then
  echo "Iteration \"$ITERATION_TITLE\" not found in Project #$PROJECT_NUMBER."
  exit 1
fi

gh project item-edit \
  --id "$ITEM_ID" \
  --project-id "$PROJECT_ID" \
  --field-id "$ITERATION_FIELD_ID" \
  --iteration-id "$ITERATION_ID"

echo "Issue #$ISSUE_NUMBER created and added to Project #$PROJECT_NUMBER (Iteration: $ITERATION_TITLE)."

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
  --iteration "<title>"     Iteration title, or "current" to auto-select the
                            iteration active today (or ITERATION_TITLE env var)

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

# ---------- 2: Validate labels exist ----------
ALL_LABELS="$MANDATORY_LABELS${LABELS:+,$LABELS}"

# Verify every label exists first — gh issue create fails on unknown labels,
# and under set -e that failure would otherwise be silent (see below).
EXISTING_LABELS=$(gh label list --repo "$OWNER/$REPO" --limit 200 --json name --jq '.[].name')
MISSING_LABELS=""
IFS=',' read -ra _lbls <<<"$ALL_LABELS"
for _l in "${_lbls[@]}"; do
  grep -qxF "$_l" <<<"$EXISTING_LABELS" || MISSING_LABELS+="${_l}, "
done
if [[ -n "$MISSING_LABELS" ]]; then
  echo "Labels missing in $OWNER/$REPO: ${MISSING_LABELS%, }"
  echo "Create them first: gh label create \"<name>\" --repo $OWNER/$REPO --color <hex>"
  exit 1
fi

# ---------- 3: Resolve and validate the project + iteration BEFORE creating anything ----------
# Fail fast. gh project item-edit runs AFTER the issue is created, so an invalid iteration
# (e.g. one that has rolled off the board) used to leave an orphaned, iteration-less issue.
# All board lookups now happen here, before gh issue create.

PROJECT_ID=$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json --jq '.id' 2>/dev/null || true)
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]]; then
  echo "Project #$PROJECT_NUMBER not found for owner \"$OWNER\"."
  exit 1
fi

OWNER_TYPE=$(gh api "users/$OWNER" --jq .type 2>/dev/null || true)
if [[ -z "$OWNER_TYPE" || "$OWNER_TYPE" == "null" ]]; then
  echo "Owner \"$OWNER\" not found."
  exit 1
fi

# One query shape, parameterized by owner root (organization vs user).
ITER_QUERY='
  query($owner:String!, $number:Int!) {
    OWNER_ROOT(login: $owner) {
      projectV2(number: $number) {
        fields(first: 50) {
          nodes {
            ... on ProjectV2IterationField {
              id
              name
              configuration { iterations { id title startDate duration } }
            }
          }
        }
      }
    }
  }'
case "$OWNER_TYPE" in
  Organization)
    ITERATION_DATA=$(gh api graphql -f query="${ITER_QUERY/OWNER_ROOT/organization}" -F owner="$OWNER" -F number="$PROJECT_NUMBER")
    FIELD_PATH='.data.organization.projectV2.fields.nodes' ;;
  User)
    ITERATION_DATA=$(gh api graphql -f query="${ITER_QUERY/OWNER_ROOT/user}" -F owner="$OWNER" -F number="$PROJECT_NUMBER")
    FIELD_PATH='.data.user.projectV2.fields.nodes' ;;
  *)
    echo "Unsupported owner type: $OWNER_TYPE"; exit 1 ;;
esac

ITERATION_FIELD_ID=$(jq -r "$FIELD_PATH | .[] | select(.name==\"Iteration\") | .id" <<<"$ITERATION_DATA")
if [[ -z "$ITERATION_FIELD_ID" || "$ITERATION_FIELD_ID" == "null" ]]; then
  echo "No Iteration field found in Project #$PROJECT_NUMBER."
  exit 1
fi

if [[ "$ITERATION_TITLE" == "current" || "$ITERATION_TITLE" == "@current" ]]; then
  # Auto-select the iteration whose [startDate, startDate+duration) window contains today.
  TODAY="$(date +%Y-%m-%d)T00:00:00Z"
  read -r ITERATION_ID ITERATION_TITLE < <(jq -r --arg today "$TODAY" \
    "$FIELD_PATH | .[] | select(.name==\"Iteration\") | .configuration.iterations[]
     | select(((.startDate + \"T00:00:00Z\")|fromdateiso8601) <= (\$today|fromdateiso8601)
              and (\$today|fromdateiso8601) < (((.startDate + \"T00:00:00Z\")|fromdateiso8601) + (.duration*86400)))
     | \"\(.id)\t\(.title)\"" <<<"$ITERATION_DATA" | head -n1) || true
  if [[ -z "${ITERATION_ID:-}" ]]; then
    echo "No iteration is active today ($(date +%Y-%m-%d)) in Project #$PROJECT_NUMBER. Available iterations:"
    jq -r "$FIELD_PATH | .[] | select(.name==\"Iteration\") | .configuration.iterations[] | \"  - \(.title)\"" <<<"$ITERATION_DATA"
    exit 1
  fi
else
  ITERATION_ID=$(jq -r --arg title "$ITERATION_TITLE" \
    "$FIELD_PATH | .[] | select(.name==\"Iteration\") | .configuration.iterations[] | select(.title==\$title) | .id" <<<"$ITERATION_DATA")
  if [[ -z "$ITERATION_ID" || "$ITERATION_ID" == "null" ]]; then
    echo "Iteration \"$ITERATION_TITLE\" not found in Project #$PROJECT_NUMBER. Available iterations:"
    jq -r "$FIELD_PATH | .[] | select(.name==\"Iteration\") | .configuration.iterations[] | \"  - \(.title)\"" <<<"$ITERATION_DATA"
    echo "Tip: pass --iteration current to auto-select the active iteration."
    exit 1
  fi
fi

# ---------- 4: Create the issue (labels and iteration already validated) ----------
# Guard the command substitution: with set -e, a bare VAR=$(gh ...) that fails
# aborts the script before any error output is printed.
if ! ISSUE_CREATE_OUTPUT=$(gh issue create \
  --repo "$OWNER/$REPO" \
  --title "$ISSUE_TITLE" \
  --body-file "$BODY_FILE" \
  --label "$ALL_LABELS" 2>&1); then
  echo "gh issue create failed:"
  printf '%s\n' "$ISSUE_CREATE_OUTPUT"
  exit 1
fi
printf '%s\n' "$ISSUE_CREATE_OUTPUT"

ISSUE_URL=$(printf '%s\n' "$ISSUE_CREATE_OUTPUT" | grep -Eo 'https://github.com/[^ ]+/issues/[0-9]+' | tail -n 1 || true)
if [[ -z "$ISSUE_URL" ]]; then
  echo "Failed to parse issue URL from gh output."
  exit 1
fi
ISSUE_NUMBER="${ISSUE_URL##*/}"

# ---------- 5: Add to the project and set the iteration (IDs resolved in step 3) ----------
ITEM_ID=$(gh project item-add "$PROJECT_NUMBER" \
  --owner "$OWNER" \
  --url "$ISSUE_URL" \
  --format json \
  --jq '.id')

gh project item-edit \
  --id "$ITEM_ID" \
  --project-id "$PROJECT_ID" \
  --field-id "$ITERATION_FIELD_ID" \
  --iteration-id "$ITERATION_ID"

echo "Issue #$ISSUE_NUMBER created and added to Project #$PROJECT_NUMBER (Iteration: $ITERATION_TITLE)."

#!/usr/bin/env bash
set -euo pipefail

# ---------- Inputs ----------
DEFAULT_ISSUE_TITLE="build(all): Upgrade to .NET 10 and add AVI.ApiHelpers"
ISSUE_TITLE="${ISSUE_TITLE:-$DEFAULT_ISSUE_TITLE}"
ISSUE_BODY="${ISSUE_BODY:-}"
ISSUE_BODY_FILE="${ISSUE_BODY_FILE:-}"
OWNER="${OWNER:-AVIFoodsystems}"
REPO="${REPO:-auth}"
PROJECT_NUMBER="${PROJECT_NUMBER:-3}"
ITERATION_TITLE="${ITERATION_TITLE:-Iteration 3 - 2026}"
LABELS="${LABELS:-Auth,tech-debt}"

usage() {
  cat <<'USAGE'
Usage: create_stories.sh [options]

Options:
  --title "..."             Issue title (or set ISSUE_TITLE env var)
  --body "..."              Issue body text (or set ISSUE_BODY env var)
  --body-file <path|->      Issue body file path; use "-" to read from stdin
  --owner <owner>           Repo owner (default: AVIFoodsystems)
  --repo <repo>             Repo name (default: auth)
  --project <number>        Project number (default: 3)
  --iteration "<title>"     Iteration title (default: Iteration 3 - 2026)
  --labels "a,b"            Comma-separated labels (default: Auth,tech-debt)
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

if [[ -z "$ISSUE_TITLE" ]]; then
  echo "ISSUE_TITLE is required."
  exit 1
fi

# ---------- 1️⃣  Build the issue body ----------
BODY_FILE=""
if [[ -n "$ISSUE_BODY_FILE" ]]; then
  if [[ "$ISSUE_BODY_FILE" == "-" ]]; then
    BODY_FILE="/tmp/.stories/issue-$(date +%s).md"
    mkdir -p "$(dirname "$BODY_FILE")"
    cat > "$BODY_FILE"
  elif [[ -f "$ISSUE_BODY_FILE" ]]; then
    BODY_FILE="$ISSUE_BODY_FILE"
  else
    echo "Body file not found: $ISSUE_BODY_FILE"
    exit 1
  fi
elif [[ -n "$ISSUE_BODY" ]]; then
  BODY_FILE="/tmp/.stories/issue-$(date +%s).md"
  mkdir -p "$(dirname "$BODY_FILE")"
  printf '%s\n' "$ISSUE_BODY" > "$BODY_FILE"
else
  BODY_FILE="/tmp/.stories/issue-$(date +%s).md"
  mkdir -p "$(dirname "$BODY_FILE")"

  cat > "$BODY_FILE" <<'EOF'
## Description
Upgrade the Authentication repository to .NET 10 and replace the hand‑rolled CORS and authentication logic with the AVI.ApiHelpers package in both the Authentication and Users projects.  
This will standardize the APIs with the rest of the system.

## Proposed solution
- Update the target framework in `Authentication.csproj` and `Users.csproj` to `net10.0`.  
- Add the `AVI.ApiHelpers` NuGet package reference to both projects.  
- Refactor `Program.cs` in each project:
  - Remove the existing CORS and auth middleware.  
  - Add `builder.Services.AddCors(...)` and `builder.Services.AddAuthentication(...)` via the helpers.  
  - Configure the middleware pipeline with `app.UseCors(...)` and `app.UseAuthentication()`.  
- Update Dockerfiles to use the .NET 10 SDK/runtime images.  
- Adjust CI pipeline (`.github/workflows/*`) to build against .NET 10.  
- Run the full test suite and fix any regressions.  
- Update any environment‑specific configuration (e.g., `appsettings.Development.json`) to match the new helper usage.

## Additional context
- **Package docs**: https://internal.company.com/docs/AVI.ApiHelpers  
- **Affected environments**: dev, staging, prod  
- **Dependencies**: Docker, GitHub Actions, Azure App Service  
- **Related work**: None yet – this is a tech‑debt cleanup.

## User Story
- As a **developer**, when I run the Authentication service, I expect it to use the standardized CORS and authentication middleware provided by AVI.ApiHelpers.  
- As a **DevOps engineer**, when I deploy the service, I expect the Docker image to be built with .NET 10 and the CI pipeline to succeed.

## Acceptance Criteria
- [ ] GIVEN the repo is upgraded, WHEN I run `dotnet build`, THEN the build succeeds without errors.  
- [ ] GIVEN the repo is upgraded, WHEN I run `dotnet test`, THEN all tests pass.  
- [ ] GIVEN the service is running, WHEN I send a cross‑origin request, THEN the correct CORS headers are returned.  
- [ ] GIVEN the service is running, WHEN I authenticate a request, THEN the authentication middleware from AVI.ApiHelpers is invoked.  
- [ ] GIVEN the service is running, WHEN I inspect logs, THEN I see “AVI.ApiHelpers initialized” entries.  
- [ ] Performance: response time for authenticated requests < 200 ms under 100 concurrent users.  
- [ ] The Docker image is built from the .NET 10 SDK/runtime images.  
- [ ] CI pipeline passes on all branches.

EOF

fi

# ---------- 2️⃣  Create the issue ----------
# Create the issue
ISSUE_CREATE_OUTPUT=$(gh issue create \
  --repo "$OWNER/$REPO" \
  --title "$ISSUE_TITLE" \
  --body-file "$BODY_FILE" \
  --label "$LABELS" 2>&1)
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

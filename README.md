# avi-migration

Claude Code plugin for planning AVI Foodsystems .NET 10 API migrations and turning the plan into developer-ready GitHub Project iteration stories.

## Skills

| Skill | Purpose |
|---|---|
| `dotnet10-migration` | PM-style planner: inventories a legacy API (endpoints **and** the database objects behind them), ranks endpoints by real complexity, and drafts a full five-phase story list for migration to the AVI gRPC .NET 10 stack (`AVI.gRPC.API.Template`) |
| `github-project-iteration-issue` | Story creator: formats developer-ready issues (conventional-commit titles, five-section body, GIVEN/WHEN/THEN acceptance criteria) and creates them via `gh`, adding each to a Project v2 board and setting the Iteration field |

The two compose: `dotnet10-migration` plans and drafts; `github-project-iteration-issue` is the formatting authority and creates the issues.

## Prerequisites

- `gh` CLI authenticated **with the `project` scope** (`gh auth refresh -s project`). If your active credential is a `GITHUB_TOKEN` env var without that scope, run story creation with `env -u GITHUB_TOKEN` so `gh` falls back to keyring auth.
- `jq`
- Access to the AVI.ApiHelpers repo (for the `AVI.gRPC.API.Template` dotnet new template)
- Database access (connection or schema export) for the migration-planning inventory step

## Installation

From a marketplace that includes this repo:

```
/plugin install avi-migration
```

Or test locally:

```bash
claude --plugin-dir /path/to/avi-skills
```

## Usage

Start a migration plan:

```
/avi-migration:dotnet10-migration
```

or just describe the work — "plan the migration of AVIFoodsystems/legacy-orders to .NET 10" — and the skill triggers. It will collect the required inputs (origin/destination repos, business domain, main entity, project number, iteration, labels, database strategy), inventory the code and database, present a draft story list for approval, then create the stories.

Create a one-off story directly:

```
/avi-migration:github-project-iteration-issue
```

## Structure

```
avi-skills/
├── .claude-plugin/plugin.json
└── skills/
    ├── dotnet10-migration/
    │   ├── SKILL.md
    │   └── references/
    │       ├── migration-phases.md      # five-phase plan
    │       ├── conventions.md           # layer layout, gRPC pattern, unit test rules
    │       ├── template-usage.md        # AVI.gRPC.API.Template install/scaffold
    │       └── database-inventory.md    # schema extraction, snapshot format, proto mappings
    └── github-project-iteration-issue/
        ├── SKILL.md
        └── scripts/create_stories.sh    # issue → project board → iteration
```

The reference files under `dotnet10-migration/references/` are also useful standalone during implementation — load `conventions.md` and `database-inventory.md` in coding sessions so migrated code follows AVI conventions and proto messages derive from actual query projections.

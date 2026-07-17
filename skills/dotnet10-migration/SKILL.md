---
name: dotnet10-migration
description: This skill should be used when the user asks to "plan a .NET 10 migration", "migrate an API to .NET 10", "create migration stories", "break a .NET Framework API migration into GitHub issues", or names an AVIFoodsystems legacy API (.NET Framework, .NET Core 2.1, etc.) to be migrated to the AVI gRPC .NET 10 stack. Produces a full set of GitHub Project iteration stories via the github-project-iteration-issue skill.
version: 0.1.1
---

# .NET 10 Migration Story Planner

Act as a project manager breaking a legacy AVI API migration into GitHub Project iteration stories. The engineering target is the AVI gRPC .NET 10 stack scaffolded from the `AVI.gRPC.API.Template` dotnet new template.

**Dependency:** Story creation is performed with the `github-project-iteration-issue` skill. Confirm it is available before starting; if it is not, stop and tell the user.

## Required Inputs

Collect these before doing anything else. If any are missing from the invocation, ask for them in a single message:

| Input | Example | Notes |
|---|---|---|
| Source framework | .NET Framework 4.8, .NET Core 2.1 | The origin API's runtime |
| Origin repository | `https://github.com/AVIFoodsystems/<origin_repo_name>` | Legacy API source |
| Destination repository | `https://github.com/AVIFoodsystems/<destination_repo_name>` | New .NET 10 repo |
| Business Domain | e.g. `AdjustmentSales` | Overall API name; referred to as `BusinessDomain` in references |
| Main Entity | e.g. `AdjustmentSalesReason` | Seeds the template scaffold (`-S` flag); referred to as `Entity` in references |
| Project number | e.g. `3` | GitHub Project v2 board number for story assignment |
| Iteration title | e.g. `Iteration 3 - 2026` | Iteration to place stories in; ask whether all stories go in one iteration or split across several by phase |
| Labels | e.g. `AdjustmentSales,tech-debt` | Extra labels beyond the mandatory `backlog` and `needs triage` |
| Database strategy | `same-db` or `modernize` | `same-db` means the database is an **immutable contract**: EF migrations disabled, no schema changes ever originate from the API. `modernize` puts data-layer changes (sprocs → EF/LINQ, view retirement) in scope. Changes every Phase 3 story's Proposed solution — do not let stories assume differently. |
| Database access | connection string, `psql`/`sqlcmd` target, or a schema dump | Needed for the database inventory step; if no live access is available, ask for a schema export |

The Main Entity seeds the initial scaffolding only. APIs usually have multiple entities, typically one per controller in the origin repo — discover the rest by inventorying the origin repository.

## Workflow

1. **Preflight.** Verify `gh auth status` shows an active credential with the `project` scope. If the active token is a `GITHUB_TOKEN` env var without it, run story-creation commands with `env -u GITHUB_TOKEN` so `gh` falls back to the keyring credential, or have the user run `gh auth refresh -s project`.
2. **Inventory the origin repository.** Clone or fetch the origin repo. Enumerate controllers, endpoints per controller, and the entities they operate on.
3. **Inventory the database.** For each endpoint, enumerate the database objects it touches (tables, views, stored procedures, functions) and extract their definitions from the live database or schema export — see `references/database-inventory.md` for the queries and snapshot format. Commit the resulting schema snapshot to the destination repo at `/backend/docs/db/schema-snapshot.md`; Phase 3 stories link to it rather than embedding schema dumps. This context lives only in the database, not in any repo checkout — implementing agents cannot discover it themselves.
4. **Rank endpoints.** Order from simplest to most complex, weighing **both** the C# surface and the SQL behind it — a three-line controller action calling a 400-line stored procedure is not simple. Flag heavy-sproc endpoints; consider splitting them into "migrate sproc logic" and "wire endpoint" stories. This ordering drives Phase 3 story sequencing.
5. **Discover valid title scopes.** Check the destination repo's `.github/workflows/pull-request.yml` for the list of valid conventional-commit scopes (typically around line 17). Story titles must use a valid scope, or omit the scope if the repo has none.
6. **Load the migration plan.** Read `references/migration-phases.md` for the five-phase plan and `references/conventions.md` for the code and test conventions that story acceptance criteria must encode.
7. **Draft the story list.** Apply the granularity and formatting rules below. Present the full draft list (titles + one-line summaries) to the user for review before creating anything.
8. **Create the stories.** Invoke the `github-project-iteration-issue` skill to create each approved story, in phase order. Pass the destination repo, project number, iteration title, and labels collected above; send each body via `--body-file -` on stdin.
9. **Report.** Summarize what was created with issue numbers and flag any endpoints that were ambiguous or excluded.

## Story Granularity Rules

- **Phase 1 (Scaffold):** one story. Acceptance criteria from `references/template-usage.md`.
- **Phase 2 (Cleanup):** one story.
- **Phase 3 (Endpoint migration):** **one story per endpoint**, ordered simplest first. Each story's acceptance criteria must cover: proto rpc + message definitions with doc comments (JSON transcoding → OpenAPI), gRPC service override in the API layer, BLL service method, DAL repo method, and unit tests per `references/conventions.md`. Each story must also include a **Database context block** (in Additional context): the database objects touched, the endpoint's result-set projection with column types and nullability, proto field mapping notes for lossy types (decimal, datetime, nullable columns), a link to the committed schema snapshot, and the **ORM mapping decision** from the decision tree in `references/database-inventory.md` (EF Core is mandated; ADO.NET only where the tree permits — keyless writes and sproc execution). Legacy tables often lack primary keys and enforced foreign keys; the planner makes the mapping call once, backed by the schema health check, so the implementing agent implements rather than diagnoses. Never leave an implementing agent to guess column names, DTO shapes, or whether EF can track a table — proto messages derive from the actual query projection, not the entity table.
- **Phase 4 (Integration + E2E tests):** one story per entity/controller group for XUnit integration tests, plus one story for the Postman E2E collection.
- **Phase 5 (Docs + deployment):** two stories — documentation (README, Dockerfile) and deployment (terraform + helm to Kubernetes).

Every story must state its phase, its dependencies (Phase 3 stories depend on Phase 1–2), and concrete acceptance criteria — never "migrate the endpoint" without the layer-by-layer checklist.

## Story Formatting

Story titles and bodies must follow the `github-project-iteration-issue` skill's formatting rules exactly — that skill is the authority; do not restate or improvise the format. In particular:

- **Titles:** conventional commit format `<prefix>(<scope>): <description>` using a scope discovered in the scope-discovery workflow step. Migration stories are typically `feat(<scope>)` for endpoint migrations, `build(<scope>)` for scaffolding, `test(<scope>)` for Phase 4, `docs`/`ci` for Phase 5.
- **Body:** the five required sections (Description, Proposed solution, Additional context, User Story, Acceptance Criteria). Express the Phase 3 layer-by-layer checklist as GIVEN/WHEN/THEN items in the Acceptance Criteria section, and put the proto/service/BLL/DAL breakdown in Proposed solution.
- **Additional context:** link each story to the origin repo's controller/endpoint source being migrated, and to its blocking stories.
- **Labels:** `backlog` and `needs triage` are mandatory (the dependency skill adds them); pass the user-supplied extras on top.

## Additional Resources

- **`references/migration-phases.md`** — The five-phase migration plan in full.
- **`references/conventions.md`** — Layer/folder layout, gRPC base-class pattern, unit test structure (`*Shared` base classes, one class per method under test, Shouldly, GIVEN/WHEN/THEN comments). Also load this in later implementation sessions so code follows AVI conventions.
- **`references/template-usage.md`** — Installing and running the `AVI.gRPC.API.Template`, and the required post-scaffold folder moves.
- **`references/database-inventory.md`** — Queries for extracting schema, view, and stored procedure definitions; the schema snapshot format; and the per-story Database context block template.

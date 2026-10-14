# avi-skills

AVI's shared engineering standards and reusable agent workflows for Codex, Claude Code and Kiro. Canonical content generates portable Agent Skills, Agent Plugins and client compatibility adapters from one catalog. Repository bundles and managed user installations are both supported distribution methods.

This checkout prepares distribution release **0.2.0**. Packaging and lifecycle checks are executable; required client/model behavioral evaluations remain untested, so the first release is not yet declared supported. See [compatibility evidence](docs/compatibility.md) and [the release gate](docs/evaluations.md).

## Packages

| Package | Skills | Purpose |
| --- | --- | --- |
| `avi-migration` 0.1.5 | `dotnet10-migration`, `github-project-iteration-issue` | Plan AVI .NET 10/gRPC API migrations and create developer-ready GitHub Project iteration stories |
| `avi-engineering` 0.1.0 | `avi-angular`, `avi-nx`, `avi-ngrx`, `avi-ionic-capacitor`, `avi-architecture-review` | Apply shared conventions and review applicable architecture with rule IDs and code evidence |

Engineering skills inspect repository versions, configuration and models before applying relevant references. Existing Reactive Forms/Formly and classic NgRx features retain their architectures unless migration is requested. Official Angular/Nx skills and MCP tools are optional aids. Repository-specific versions, auth aliases, endpoints, native platforms and exceptions stay in consuming repositories.

## Get started

Use Node.js 24 LTS and npm:

```bash
npm ci
npm run build
npm run verify
node tooling/cli.mjs install --target /path/to/application --scope repository \
  --clients codex,claude,kiro --packages avi-engineering --release 0.2.0 --dry-run
```

Review the preview and repeat without `--dry-run`. For managed user skills, use `--scope user`; for immutable plugin/Power packages, also use `--mode native` and follow the returned client activation steps. The Codex IDE extension uses standalone skills. Older Kiro custom agents can use `--clients kiro --mode compat`.

Repository installs record `avi-skills.lock.json`; user installs record `.avi-skills/receipt.json`. Updates refuse modified managed files, preserve unrelated instructions/configuration, and support preview and rollback. Uninstall removes only unchanged owned files/blocks. See [installation, updates and native activation](docs/installation.md) for exact commands and diagnostics.

## Existing migration usage

The `avi-migration` identity, two skill names and Claude namespace commands are preserved:

```text
/plugin install avi-migration@avi-skills
/avi-migration:dotnet10-migration
/avi-migration:github-project-iteration-issue
```

Local development continues to work with `claude --plugin-dir /path/to/avi-skills`. The marketplace now also offers `avi-engineering`; its local package is `plugins/avi-engineering`.

`dotnet10-migration` inventories endpoints and database objects, ranks real complexity and drafts AVI's five-phase migration stories. `github-project-iteration-issue` remains the story-formatting authority and creates approved issues through the unchanged `scripts/create_stories.sh` interface. Selecting the planner through the installer automatically includes that dependency.

Migration prerequisites: authenticated `gh` with `project` scope, `jq`, access to AVI.ApiHelpers (`AVI.gRPC.API.Template`), and database access or an exported schema. If `GITHUB_TOKEN` lacks project scope, use the existing skill's keyring-auth guidance. Test fixtures use a mocked `gh` and never create live issues. [Migration references](skills/dotnet10-migration/references/conventions.md) remain usable during implementation.

## Authoring and verification

```text
standards/                  Canonical rules, provenance and adoption registry
skill-sources/              Canonical seven skills, scripts and private references
adapters/                   Compact client entrypoints and Kiro resource template
catalog.json                Versions, package membership and dependencies
tooling/                    Build, validate, install, update, check, doctor, uninstall
tests/                      Packaging/lifecycle tests and behavioral evaluation fixtures
skills/                     Generated legacy migration skills
plugins/avi-engineering/    Generated engineering plugin and closed references
plugin.json                 Portable avi-migration manifest
.claude-plugin/             Preserved Claude identity and extended marketplace
dist/                       Generated archives/checksums (ignored; uploaded by CI)
```

Edit canonical sources, run `npm run build`, then commit generated installation surfaces. Validation rejects invalid metadata, dependencies, local links, missing references and generated drift. The tooling has no npm runtime dependencies and does not introduce an Nx workspace. [Maintenance and releases](docs/maintenance.md) describes ownership, rule status, semantic versions and the compatibility gate. [CHANGELOG.md](CHANGELOG.md) records behavior changes and upgrade steps.

No consuming repository adoption changes or public publication are part of this implementation. Existing consumers remain pinned until deliberately updated.

# Content ownership and releases

AVI repository maintainers own standards review and compatibility evidence. Preserve repository visibility and publisher attribution. No public publication, cloud-agent certification, model-specific tuning, custom MCP infrastructure, Nx workspace or new generators is implied by this implementation.

Author shared rules in `standards/`, workflows/scripts in `skill-sources/`, and adapters in `adapters/`. [catalog.json](../catalog.json) defines membership, versions and dependency closure. Generated `skills/`, `plugins/avi-engineering/`, root `plugin.json`, and `.claude-plugin/` are committed installation surfaces; never hand-edit them. `tooling/generated-files.json` tracks generated paths. Run `npm run build` after source changes, then `npm run verify`. CI rejects stale or extra generated resources.

Each rule in [the registry](../standards/registry.json) has a stable ID, status, applicability, maintainer and source references. Retain IDs when clarifying behavior; use a new ID for a materially different rule and document deprecation. Keep proposals as recommendations until maintainers record adoption. Quarantine unverified examples instead of turning them into requirements. Model fields, auth imports, versions, deployment configuration and scoped exceptions stay in the consuming repository.

Record an exception locally with its rule ID, paths, condition, rationale, owner and optional review date. A review should cite exact code evidence and distinguish adopted violations, advisory proposals and uncertainty. Markdown guides decisions; configured lint rules, CI and executable checks enforce behavior where possible.

The original migration conventions intentionally remain AVI-specific. The preserved script interface is authoritative; `dotnet10-migration` requires `github-project-iteration-issue`. Metadata normalization moves versions into `metadata`; it does not change the five-phase migration workflow, approval sequence or issue-creation behavior.

## Release checklist

1. Review rule provenance/status and reference dependencies; record behavior changes, affected IDs, upgrade steps and deprecations in [CHANGELOG.md](../CHANGELOG.md).
2. Bump catalog distribution release and affected package/skill versions using semantic versioning. Preserve names and existing namespace commands. Regenerate and commit installation surfaces.
3. Run `npm ci`, `npm run build`, `npm run verify`, and isolated packaging/lifecycle tests. No live issues are created by tests.
4. Run the [behavioral evaluations](evaluations.md) for required client/surface/mode/model combinations, including an isolated avi-web pilot and non-Nx fixture. Record loaded references, decisions and artifacts.
5. Run `npm run release:check`. Untested or failed required combinations block declaring supported status. Review compatibility sources/dates when adding client features or minimum versions.
6. Tag the reviewed commit, rebuild from that tag, and attach archives/checksums/provenance as release artifacts. CI artifact upload is enabled; publication remains a separate authorized operation.

Consumers stay pinned until deliberate updates. Review an update dry-run, move local edits into exceptions, install, check checksums and verify client activation. Native caches can require separate reinstall/re-registration; stage immutable version paths before switching.

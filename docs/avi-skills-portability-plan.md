# AVI Skills: portable standards and tooling for Codex, Claude Code, and Kiro

## Summary

Evolve `/Users/brinehart/repos/avi-skills` into AVI’s shared standards and skills repository. Keep its name and preserve the existing `avi-migration` plugin and commands.

The original proposal is sound. Strengthen it with:

- Two equally supported distribution methods: pinned repository bundles and managed client installations.
- Open **Agent Skills** content and **Agent Plugins** packaging, with small compatibility adapters.
- A clear distinction between adopted standards, recommendations, and application-specific facts.
- Reproducible builds, installation checks, and behavioral evaluations across clients.

Support CLI and IDE workflows first, including compatibility paths for older clients. Keep standards independent of the selected model.

Current documentation supports this approach: [Agent Skills](https://agentskills.io/specification), [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins), and [Kiro Powers](https://kiro.dev/docs/powers/create/) share portable formats. Codex’s [IDE extension still requires standalone skills](https://learn.chatgpt.com/docs/plugins).

## 1. Establish authoritative content

**Separate the three kinds of guidance.**

| Content | Authoritative location | Examples |
|---|---|---|
| Shared AVI standards | `avi-skills` | Library boundaries, state selection, testing conventions |
| Reusable workflows | `avi-skills` skills | Apply Angular conventions, review architecture, plan migrations |
| Repository facts and exceptions | Consuming repository | Versions, model types, endpoints, auth packages, deployment configuration |

Extract reusable material from `avi-web`’s Angular, Nx, NgRx, and Ionic/Capacitor documentation. Split large documents into focused references; the Angular standards currently approach 2,000 lines.

For each standard, record a stable identifier, adoption status, applicability, maintainer, and source references. Preserve proposed practices as recommendations. Conflicting or unverified material stays non-normative until reviewed.

Retain general rules such as “derive identifier types from the actual model.” Replace application-specific examples with clearly illustrative examples. Keep actual numeric account IDs, `@avi-web/auth`, deployment tags, and package versions in `avi-web`.

Document AVI’s intended conflict handling: applicable repository exceptions qualify shared standards; upstream examples supply framework guidance. Do not claim that every client implements the same instruction precedence. Existing code establishes current behavior but does not automatically override an explicit standard.

**Create five focused skills:**

- `avi-angular`: AVI component, TypeScript, forms, accessibility, and testing conventions.
- `avi-nx`: AVI project boundaries, generator selection, and workspace task conventions.
- `avi-ngrx`: Signal Store and classic Store/Effects/Entity selection and implementation.
- `avi-ionic-capacitor`: Native configuration, platform workflows, and storage/API boundaries.
- `avi-architecture-review`: Review requested changes against applicable standards, citing rule IDs and code evidence.

Each skill inspects repository versions, configuration, and relevant models before selecting references. Preserve existing form and state architectures unless migration is requested.

Complement official Angular and Nx skills. Core AVI guidance must remain usable when those optional skills or MCP tools are unavailable. Declare genuine dependencies explicitly: selecting `dotnet10-migration` also includes `github-project-iteration-issue`.

Preserve the existing migration workflow’s intentional AVI-specific conventions and GitHub script interface. Normalize skill metadata to the open specification, including moving custom top-level `version` fields into `metadata`.

## 2. Build one source into portable packages

Use this authoring and distribution structure:

```text
avi-skills/
├── standards/                   # Canonical shared standards
├── skill-sources/               # Canonical instructions, scripts, references
├── adapters/                    # Client entrypoint/configuration templates
├── catalog.json                 # Package membership and reference dependencies
├── tooling/                     # Build, validate, install, update, diagnose
├── tests/                       # Packaging fixtures and evaluation scenarios
├── skills/                      # Generated legacy migration skills
├── plugins/avi-engineering/     # Generated package containing the five new skills
├── plugin.json                 # Portable avi-migration manifest
└── .claude-plugin/              # Existing Claude identity and marketplace
```

Move authoring sources for the two existing skills into `skill-sources`, while generating their current public paths under `skills`. This preserves existing imports, script paths, and `claude --plugin-dir` usage.

Generate two packages:

- **`avi-migration`**: the existing two skills, preserving their names and commands.
- **`avi-engineering`**: the five new skills and their required standards.

Each package receives a root Agent Plugins manifest and a Claude-compatible manifest generated from the same catalog. Maintain the existing marketplace identity and add `avi-engineering` as a separate entry.

Every distributed skill must contain its required reference files. Resolve reference dependencies and rewrite links during generation; reject references escaping the installed bundle. Generated duplication is acceptable, but handwritten duplicate standards are not.

Commit generated directories needed for Git-based installation and enforce regeneration checks in CI. Also publish standalone skill archives and checksums from the same build.

Use Node.js 24 LTS, npm, and a lockfile for repository tooling. Keep `avi-skills` a small documentation/tooling repository without introducing an Nx workspace.

## 3. Provide client adapters and both installation modes

| Client | Repository installation | Managed installation and compatibility |
|---|---|---|
| Codex | Standalone skills in `.agents/skills`; root `AGENTS.md` | Native plugins on supported CLI versions; standalone user skills for IDE and older clients |
| Claude Code | Skills in `.claude/skills`; a small `CLAUDE.md` importing `AGENTS.md` | Claude marketplace/plugin installation with the existing namespace preserved |
| Kiro | Skills in `.kiro/skills`; root `AGENTS.md` | Skills-only Powers on supported versions; explicit file resources for older CLI/custom-agent configurations |

Use Claude’s documented [`@AGENTS.md` import](https://code.claude.com/docs/en/memory) for compatibility with older versions and configurations. Keep client-specific syntax out of the shared `AGENTS.md`.

For Kiro, distinguish native skill discovery from custom-agent resource configuration. Current clients support `skill://` resources; the [CLI 2.x reference](https://kiro.dev/docs/cli/2x-reference/) requires a compatibility path using `file://`. Supply a compact routing resource for those clients rather than loading every standard into every conversation.

Keep the always-loaded entrypoint short: repository context, selected AVI package, applicable local exceptions, and directions for finding relevant skills. Detailed standards load on demand.

**Expose a small tooling interface:**

- `build`: generate packages and standalone archives.
- `validate`: check content, manifests, references, and generated output.
- `install` / `update`: select release, skills, clients, and repository or user scope.
- `check`: detect drift against the selected release.
- `doctor`: report client capabilities, missing resources, duplicates, and version conflicts.
- `uninstall`: remove only unchanged files owned by that installation.

Installation and updates support dry-run previews, preserve unrelated configuration, and refuse to overwrite modified managed files silently. Use ordinary files rather than requiring symlinks.

Repository installations record the source commit, release, selections, client modes, and file checksums in `avi-skills.lock.json`. Managed installations receive an equivalent local receipt. When a repository specifies a release, diagnostics compare active managed packages with that requirement.

Support both distribution methods without assuming they should be simultaneously active for the same skill in one client. Detect conflicting installations and identify the source to disable.

Where a client cannot pin native installs reliably, install from an immutable, versioned local package directory. Upgrades remain deliberate and reviewable.

## 4. Validate behavior and release compatibility

**Automated checks on every change:**

- Validate Agent Skills frontmatter, package manifests, catalog dependencies, and local links.
- Rebuild packages and fail on generated-file drift.
- Install each artifact into an isolated directory and verify reference closure and executable scripts.
- Exercise installation, repeated installation, update, rollback, local-edit conflicts, and uninstall.
- Verify the two legacy skill names, migration dependency, and GitHub script interface remain available.
- Test GitHub script behavior with a mocked `gh` executable; packaging tests must not create live issues.

**Behavioral evaluations before release:**

| Scenario | Required result |
|---|---|
| Extend a classic NgRx feature | Preserve its architecture and actual identifier types |
| Implement an isolated Signal Store feature | Load relevant standards and use APIs supported by installed versions |
| Modify Reactive Forms or Formly | Preserve the existing strategy unless migration is requested |
| Create an Nx library | Discover suitable generators and apply repository boundaries |
| Work in a non-Nx repository | Avoid imposing Nx commands or layouts |
| Change a mobile feature | Discover actual native targets, storage, and authentication configuration |
| Apply a repository exception | Honor its stated scope without spreading it to unrelated code |
| Request unrelated work | Avoid activating irrelevant AVI skills |
| Use older Kiro or an IDE without plugins | Reach equivalent guidance through the compatibility adapter |

Test explicit invocation and automatic selection where supported. Record client version, model, installation mode, loaded references, and outcome. Evaluate observable decisions and artifacts rather than exact response wording.

Start with the installed CLI versions—Codex 0.160.1, Claude Code 2.1.160, and Kiro 2.29.0—and test newer plugin-capable clients separately. Include the team’s IDE integrations as distinct matrix entries. Mark untested combinations explicitly.

Pilot in an isolated `avi-web` checkout and a small non-Nx fixture with different identifier types and state conventions. Validate the legacy migration workflow separately. Require these checks before declaring the first release supported.

## 5. Rollout, maintenance, and defaults

Implement in four reviewable stages:

1. **Foundation:** catalog, authoring structure, legacy-compatible generation, and validation.
2. **Content:** reviewed standards extraction and the five new skills.
3. **Distribution:** client adapters, installation tooling, locking, and managed packages.
4. **Pilot and release:** behavioral evaluations, compatibility matrix, installation documentation, and release artifacts.

Maintain a changelog describing behavior changes, affected standards, upgrade steps, and deprecations. Use semantic releases; existing consumers remain pinned until deliberately updated. Repository maintainers own content review and compatibility results.

Document tested support separately from vendor-documented capabilities, with source links and verification dates. Recheck compatibility when adding client features or changing minimum versions.

Defaults and boundaries:

- Keep the repository name `avi-skills` and plugin name `avi-migration`.
- Treat repository bundles and managed installations as equally supported.
- Preserve current repository visibility and attribution; public publication is separate.
- Keep cloud-agent certification and model-specific optimizations outside the first release.
- Defer custom MCP infrastructure. Reconsider it when live or centrally searchable information provides a demonstrated benefit.
- Defer new Nx generators until pilots identify repeatable configuration worth automating.
- Use CI and executable checks for enforceable rules; Markdown instructions guide agent decisions but do not enforce them.
- Keep implementation changes in `avi-skills`; consuming repositories receive separate adoption changes after the pilot.

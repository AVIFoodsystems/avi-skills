# Installation and updates

Use Node.js 24 LTS and npm. This repository has no runtime npm dependencies; `npm ci` verifies the lockfile. Run `npm run build` and `npm run verify` in the selected avi-skills checkout. Installation uses the CLI below or `npm run skills:install -- ...`; there is no npm install lifecycle hook. The catalog release identifies the combined distribution; package versions identify plugins, and skill versions identify standalone archives.

## Pinned repository bundles

Use a reviewed release checkout or local immutable Git tag/commit. The installer never fetches a remote repository. The initial working tree is release preparation, not a published tag.

```bash
node tooling/cli.mjs install --target /path/to/application --scope repository \
  --clients codex,claude,kiro --packages avi-engineering --release 0.2.0 --dry-run
node tooling/cli.mjs install --target /path/to/application --scope repository \
  --clients codex,claude,kiro --packages avi-engineering --release 0.2.0
```

Repository bundles are ordinary files in `.agents/skills`, `.claude/skills` and `.kiro/skills`. Required references and executable scripts travel with each skill. `AGENTS.md` receives a compact owned block; Claude's owned `CLAUDE.md` block uses the documented `@AGENTS.md` import. Existing text outside those blocks is preserved. The installer refuses an unowned conflicting block or skill file.

`avi-skills.lock.json` records release, source commit (or null for a source archive), dirty-checkout status, source digest, package/skill selections, client mode, and file checksums/modes. A digest identifies built content and adapters even when a checkout has uncommitted changes. For a committed release, `--source /path/to/release-checkout --ref v0.2.0` selects a local Git ref without changing that checkout; `--release` verifies its catalog version. Commit generated output before creating a release tag.

Selecting only `dotnet10-migration` automatically includes `github-project-iteration-issue`:

```bash
node tooling/cli.mjs install --target /path/to/application \
  --packages avi-migration --skills dotnet10-migration --clients claude
```

## Managed user skills

Standalone user skills support older clients and the Codex IDE extension:

```bash
node tooling/cli.mjs install --scope user --clients codex,claude,kiro \
  --packages avi-engineering --release 0.2.0 --dry-run
```

Remove `--dry-run` after reviewing the preview. The default target is the current user's home; `--target` supports an isolated user directory. The receipt is `.avi-skills/receipt.json`. This does not rewrite global instructions or unrelated client configuration. Select either repository or managed guidance for the same skill/client; `doctor` reports duplicates and the location to disable. Supply `--home` when checking an isolated home.

## Native plugins and Kiro Powers

On supported surfaces, stage the same skills as immutable local packages:

```bash
node tooling/cli.mjs install --scope user --mode native --clients codex,claude,kiro \
  --packages avi-engineering --release 0.2.0
```

The output gives the version-and-digest directory and client activation steps. Native mode **stages** files; it does not claim a plugin is active or silently rewrite vendor configuration. Register the returned marketplace directory with `codex plugin marketplace add /returned/directory`, then use `codex plugin add avi-engineering@avi-skills` where supported. For Claude use `/plugin marketplace add /returned/directory`, then `/plugin install avi-engineering@avi-skills`. In a supported Kiro IDE, import each returned `plugins/<package>` folder as a custom Power. Verify activation in a fresh conversation. The receipt records `activation: staged`; client behavior is a separate release evaluation.

Previous native version directories remain owned and available across updates so an active registration remains valid while the replacement is reviewed. Switch registration deliberately; disable overlapping standalone skills. Before uninstalling staged native files, remove or disable their client registration. A client may copy packages into its own cache: this tool manages its receipt paths only, and `doctor` states that limit.

The existing Claude marketplace identity stays `avi-skills`, with `avi-migration` and `avi-engineering` entries. Git marketplace consumers can continue using their current installation workflow. Local development preserves:

```bash
claude --plugin-dir /path/to/avi-skills
claude --plugin-dir /path/to/avi-skills/plugins/avi-engineering
```

## Older Kiro custom agents

Use an explicit compact routing resource for CLI 2.x/custom-agent configurations that need `file://`:

```bash
node tooling/cli.mjs install --target /path/to/application --clients kiro --mode compat
```

This generates `.kiro/agents/avi.json` and `.kiro/avi-routing.md` alongside standalone skills. The agent resource URI uses an absolute path; regenerate after relocating the installation. Select the `avi` custom agent to use it. Existing agents are not modified. Current clients can discover standalone skills or use documented `skill://` resources; verify your version's support before modifying your own agent configuration. The generated compatibility agent deliberately contains no model pin, tool trust grants or hooks.

## Lifecycle and conflicts

```bash
node tooling/cli.mjs check --target /path/to/application
node tooling/cli.mjs doctor --target /path/to/application
node tooling/cli.mjs doctor --scope user --repository /path/to/application
node tooling/cli.mjs update --target /path/to/application --source /path/to/new-release --dry-run
node tooling/cli.mjs uninstall --target /path/to/application --dry-run
```

Updates preserve prior selections unless options change them. Check an exact source with `check --source`; check a requirement with `--release`. Roll back by updating from the earlier release checkout/ref. Modified managed files block the whole update before writes; save/restore edits or move customizations into repository exceptions. No force-overwrite flag is provided. Uninstall removes only unchanged owned files/blocks, retains modified files and their receipt entries, and preserves unrelated content. Empty directories may remain.

All mutation commands support dry-run. Check/doctor/uninstall do not need the original source checkout. CLI exit codes: 0 success; 1 invalid input/conflict/failure; 2 detected drift/diagnostic issues or retained modified uninstall files. Doctor probes CLI versions without starting model sessions; vendor caches and IDE behavior require manual evaluation.

## Archives

`npm run build` creates deterministic package and standalone `.tar.gz` archives, `SHA256SUMS`, and `release.json` in ignored `dist/`. Package archives contain portable/Claude manifests and all selected skill resources. Standalone archives contain one self-contained skill; select dependencies using the catalog or installer (a migration planner archive alone does not include its sibling skill). Release CI uploads these files as reviewable artifacts; public publication is a separate action.

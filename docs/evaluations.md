# Behavioral evaluation and pilot

Packaging tests verify formats, links, file ownership, dependencies and lifecycle operations. They do not verify model selection or framework behavior. Before declaring supported status, run [scenarios](../tests/evaluations/scenarios.json) using each required client/surface/mode in [the matrix](../tests/evaluations/matrix.json). Record version, model, invocation mode, loaded references, outcomes and observable artifacts in [results.json](../tests/evaluations/results.json).

Copy [the result template](../tests/evaluations/result-template.json) into the `runs` array for each evaluation, adapting outcome keys to that scenario. Attach reviewed diffs/transcripts/check results as evidence paths or immutable links. Keep secrets and production data out of evaluation artifacts. The reviewer attests the evidence; the gate checks coverage and structured outcomes, not the truth of arbitrary prose.

```bash
node tooling/evaluate.mjs --prepare --output /absolute/path/to/isolated-pilot \
  --avi-web /absolute/path/to/avi-web
node tooling/evaluate.mjs --check
```

Preparation copies non-Nx/Nx/mobile fixtures, installs bundles and creates one prompt per scenario. The optional avi-web pilot copies a read-only context snapshot (manifest, lockfile, workspace config, architecture docs and tracked source/configuration) into the isolated directory, excluding Git metadata, dependencies and build output. This is an isolated snapshot, not a linked worktree; the consuming repository receives no adoption changes. Generated prompts identify their fixture; run them in the named client with explicit invocation and automatic selection where supported. Install dependencies only when necessary for the scenario and with the repository's existing manager.

Use an isolated full checkout for release evaluation when history, installed tooling or native projects are needed. Do not use live issue creation: legacy migration evaluation must draft stories, and its script behavior is covered separately with mocked gh. Avoid deploying or changing live platform resources during a pilot.

For every scenario, inspect the agent's decisions and artifacts against the `requiredOutcomes`, rather than matching response wording. A pass requires evidence, reviewer and loaded references (or an explicit explanation of no AVI activation for unrelated work). Failures should identify the violated outcome and correction. Mark unavailable automatic invocation or client surfaces as untested with a reason; they do not become passes.

The release gate verifies required combinations and scenarios have passing evidence for both explicit and automatic invocation when the matrix requires both. It deliberately fails while required results are untested. Newer native clients and each IDE integration remain separate entries. Keep model identifiers as evidence of the run, not as recommendations embedded in shared standards.

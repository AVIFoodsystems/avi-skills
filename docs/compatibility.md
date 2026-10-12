# Compatibility evidence

Verified documentation on 2026-10-12 establishes formats and discovery paths; it does not establish model behavior in a client. [Evaluation results](../tests/evaluations/results.json) are the evidence ledger. Required behavioral combinations remain untested until exercised; this checkout is release preparation and does not declare the first release supported.

| Surface | Distribution | Documented capability | Executable/behavioral status |
| --- | --- | --- | --- |
| Codex CLI 0.160.1 | Repository/user standalone or native plugin | Agent Skills and locally probed plugin commands | Version/help probes; isolated packaging tests; activation/model evaluation untested |
| Codex IDE extension | Repository/user standalone | Skills; plugins unsupported | Packaging tested; IDE/model evaluation untested |
| Newer plugin-capable Codex CLI/desktop | Managed native | Portable plugins/local marketplaces | Staging tested; activation/model evaluation untested |
| Claude Code 2.1.160 | Repository standalone or migration/engineering plugins | Skills, marketplace, `@AGENTS.md` import | Isolated packaging tested; 2.1.160 confirmed with process-local Node selection; default launcher unconfigured; model evaluation untested |
| Claude IDE integration | Repository/user standalone | Depends on host integration/version | Packaging tested; host version/behavior untested |
| Kiro CLI 2.29.0 | Standalone with file-resource custom agent | CLI 2.x `file://` resources | 2.29.1 compatibility-agent schema accepted; model evaluation untested |
| Newer Kiro CLI | Standalone/current custom agents | `skill://` resources | Model evaluation untested |
| Current Kiro IDE | Managed skills-only Power or standalone | Agent Plugins and Agent Skills | Staging tested; activation/model evaluation untested |

The initial CLI versions come from the supplied plan. Doctor probes the active executable rather than assuming it matches. Probe results alone never mark a client supported. IDEs are separate matrix entries, including their host/integration version. Native keyword activation and explicit invocation may differ by client. Run automatic selection only where supported and record a reason when unavailable.

| Source | Verified claim | Checked |
| --- | --- | --- |
| [Agent Skills specification](https://agentskills.io/specification) | SKILL.md frontmatter plus optional resources; portable name/description/metadata | 2026-10-12 |
| [Agent Plugins schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json) | Root portable manifest and reverse-domain extensions | 2026-10-12 |
| [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins) | Root plugin.json, fixed skills/ discovery, local marketplace paths | 2026-10-12 |
| [OpenAI plugins overview](https://learn.chatgpt.com/docs/plugins) | IDE extension does not support plugins | 2026-10-12 |
| [Claude memory](https://code.claude.com/docs/en/memory) | CLAUDE.md imports other files using @path | 2026-10-12 |
| [Kiro Powers creation](https://kiro.dev/docs/powers/create/) | Agent Plugins format and skills-only Powers; folder import | 2026-10-12 |
| [Kiro CLI 2.x reference](https://kiro.dev/docs/cli/2x-reference/) | JSON custom agents with file:// resources; V3 adds skill:// | 2026-10-12 |

Client-specific resource URIs live in adapters, never in shared AGENTS.md. Revisit claims and required evaluations when vendor capabilities change. Native activation is an explicit client operation after staging, and external caches are outside the installer receipt.

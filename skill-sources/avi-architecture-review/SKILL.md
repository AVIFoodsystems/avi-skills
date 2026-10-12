---
name: avi-architecture-review
description: Review requested code or architecture changes against applicable AVI standards, citing rule IDs and code evidence. Use for a requested architecture review; recommendations are advisory and scoped repository exceptions apply.
metadata:
  version: "0.1.0"
---

# Avi Architecture Review

Read [repository discovery and interpretation](../../standards/context.md) before selecting APIs or applying rules. Apply these conventions to the requested scope; repository facts and documented exceptions remain local. Detailed references load only when relevant.

Establish the requested diff or design scope. Read applicable instructions, versions/configuration, models and documented exceptions; do not expand a review into unrelated changes. Select only relevant references:

- Angular: [components](../../standards/angular-components.md), [forms](../../standards/angular-forms.md), [testing](../../standards/angular-testing.md).
- Nx: [boundaries and tasks](../../standards/nx-workspace.md), only for Nx repositories.
- State: [selection](../../standards/ngrx-selection.md), then [classic](../../standards/ngrx-classic.md) or [signal](../../standards/ngrx-signal.md).
- Native: [mobile](../../standards/mobile.md).
- Proposed practices/contradictory examples: [non-normative guidance](../../standards/recommendations.md), only when relevant.

For each finding cite the rule ID/status, exact code path and line or design evidence, applicability, any scoped exception, impact and a concrete correction. Distinguish adopted-rule violations from advisory recommendations and unresolved API/source uncertainty. Do not call existing classic NgRx or Reactive Forms a violation. If evidence is insufficient, state the missing check. Report what was reviewed and verified; implementation changes require the user's requested scope.

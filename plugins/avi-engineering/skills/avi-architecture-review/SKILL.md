---
name: avi-architecture-review
description: Review requested code or architecture changes against applicable AVI standards, citing rule IDs and code evidence. Use for a requested architecture review; recommendations are advisory and scoped repository exceptions apply.
metadata:
  version: "0.1.0"
---

# Avi Architecture Review

Read [repository discovery and interpretation](references/context.md) before selecting APIs or applying rules. Apply these conventions to the requested scope; repository facts and documented exceptions remain local. Detailed references load only when relevant.

Establish the requested diff or design scope. Read applicable instructions, versions/configuration, models and documented exceptions; do not expand a review into unrelated changes. Select only relevant references:

- Angular: [components](references/angular-components.md), [forms](references/angular-forms.md), [testing](references/angular-testing.md).
- Nx: [boundaries and tasks](references/nx-workspace.md), only for Nx repositories.
- State: [selection](references/ngrx-selection.md), then [classic](references/ngrx-classic.md) or [signal](references/ngrx-signal.md).
- Native: [mobile](references/mobile.md).
- Proposed practices/contradictory examples: [non-normative guidance](references/recommendations.md), only when relevant.

For each finding cite the rule ID/status, exact code path and line or design evidence, applicability, any scoped exception, impact and a concrete correction. Distinguish adopted-rule violations from advisory recommendations and unresolved API/source uncertainty. Do not call existing classic NgRx or Reactive Forms a violation. If evidence is insufficient, state the missing check. Report what was reviewed and verified; implementation changes require the user's requested scope.

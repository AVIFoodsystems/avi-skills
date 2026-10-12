---
name: avi-ngrx
description: Select and implement AVI NgRx Signal Store or classic Store/Effects/Entity for state features. Preserve existing architecture and concrete model identifier types; migration requires requested scope.
metadata:
  version: "0.1.0"
---

# Avi Ngrx

Read [repository discovery and interpretation](references/context.md) before selecting APIs or applying rules. Apply these conventions to the requested scope; repository facts and documented exceptions remain local. Detailed references load only when relevant.

Inspect installed NgRx/Angular/RxJS packages, actual model and HTTP contracts, store ownership and provider scopes. Read [selection and ownership](references/ngrx-selection.md) before choosing an architecture.

- Extend classic features using [Store/Effects/Entity rules](references/ngrx-classic.md).
- For an isolated new or existing signal feature, read [Signal Store rules](references/ngrx-signal.md) and verify installed entity/helper APIs.

Load only the chosen implementation reference unless coexistence is in scope. Preserve actual identifier types (including valid zero IDs), current request/error conventions and form/state architecture. Keep HTTP boundaries explicit and test success/failure plus observable state transitions. Optional Angular skills may clarify framework APIs but are not dependencies.

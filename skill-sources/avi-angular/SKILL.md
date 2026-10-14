---
name: avi-angular
description: Apply AVI Angular component, TypeScript, forms, accessibility and testing conventions when implementing or reviewing Angular features. Preserve existing form architecture and use installed-version APIs.
metadata:
  version: "0.1.0"
---

# Avi Angular

Read [repository discovery and interpretation](../../standards/context.md) before selecting APIs or applying rules. Apply these conventions to the requested scope; repository facts and documented exceptions remain local. Detailed references load only when relevant.

Read the manifest, relevant Angular configuration, nearby components/models and scoped repository instructions. Determine installed versions, selector prefix, form strategy and test runner before implementation.

- For components/TypeScript/templates/accessibility, read [component rules](../../standards/angular-components.md).
- For forms or validation, read [form selection](../../standards/angular-forms.md); preserve Reactive Forms/Formly unless migration is requested.
- For unit/E2E work, read [testing](../../standards/angular-testing.md).

Implement the requested behavior, preserve public contracts, and run relevant configured checks. Official Angular skills and documentation can clarify supported APIs when available; these AVI references remain sufficient for local conventions. If the repository uses Nx, use its existing generation/task workflow; do not impose Nx elsewhere.

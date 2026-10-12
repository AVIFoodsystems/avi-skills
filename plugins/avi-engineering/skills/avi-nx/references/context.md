# Repository discovery and interpretation

Maintainer: AVI repository maintainers. Extracted 2026-10-12.
Status is recorded per rule; adopted means carried forward from the source standards, not a new team approval.

## AVI-CONTEXT-001

Status: **adopted**. Applicability: All AVI engineering work.

Read applicable repository instructions, manifest, resolved lockfile when relevant, and configuration before choosing APIs. Match documentation to each installed package, including independently versioned integrations. Do not copy avi-web version baselines into another repository.

## AVI-CONTEXT-002

Status: **adopted**. Applicability: Applying shared guidance.

Apply a documented repository exception only within its stated paths, rule IDs, and conditions. Repository facts determine models, prefixes, providers, endpoints and targets. Explicit user choices retain their scope. Framework examples inform API usage; existing code alone does not supersede an explicit applicable standard. This describes AVI interpretation, not a universal instruction precedence implemented by every client.

## AVI-TYPES-001

Status: **adopted**. Applicability: Models and storage/API boundaries.

Derive identifier types from the actual model, for example Item['id']. Keep concrete string or number keys for persisted entities; narrow optional identifiers at the boundary rather than widening all consumers to string | number. Preserve zero-valued identifiers and distinguish null/undefined from falsy values. Preserve declared synchronization IDs, date types and serialization contracts.

## Source references

- [angular/README.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/angular/README.md)
- [angular/ANGULAR_CODING_STANDARDS.md#model-identifier-types](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/angular/ANGULAR_CODING_STANDARDS.md#model-identifier-types)
- [ngrx/README.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ngrx/README.md)
- [ionic-capacitor/MOBILE_DEVELOPMENT.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ionic-capacitor/MOBILE_DEVELOPMENT.md)

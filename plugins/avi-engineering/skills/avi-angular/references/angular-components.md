# Angular components and TypeScript

Maintainer: AVI repository maintainers. Extracted 2026-10-12.
Status is recorded per rule; adopted means carried forward from the source standards, not a new team approval.

## AVI-ANGULAR-001

Status: **adopted**. Applicability: New or requested refactoring of Angular components.

Use standalone components, OnPush, and supported signal input/output APIs. Keep computed views derived rather than mirrored writable state. Preserve existing public input/output contracts during maintenance; a migration is a separate decision.

## AVI-ANGULAR-002

Status: **adopted**. Applicability: New component files and templates.

Use kebab-case file/folder names with AVI class/file suffix conventions (Component, Service, .component.ts, .service.ts). Group related component files together. Discover the repository/library selector prefix rather than adopting an application prefix from an example. Use supported native @if/@for/@switch control flow and stable model keys for tracking.

## AVI-ANGULAR-003

Status: **adopted**. Applicability: Effects and subscriptions.

Create effects in the constructor as the AVI convention; do not introduce effects in ngOnInit. Injection context and destruction scope must be valid for installed Angular APIs. Use computed for derived values and clean up subscriptions using the existing supported teardown pattern.

## AVI-ANGULAR-004

Status: **adopted**. Applicability: TypeScript implementation.

Follow the repository strict compiler and lint configuration, with explicit domain types and unknown plus narrowing for untrusted values. Prefer union/string literal types to new enums; preserve existing external contracts. Keep formatting consistent with the root configuration.

## AVI-A11Y-001

Status: **adopted**. Applicability: Interactive Angular UI.

Use semantic HTML, accessible labels, keyboard operation and appropriate ARIA. Associate validation feedback with fields, expose status changes accessibly, and preserve focus through dialogs and asynchronous updates. Do not assume a component library removes accessibility obligations.

## AVI-SECURITY-001

Status: **adopted**. Applicability: Rendering and configuration.

Use Angular-safe bindings; do not bypass sanitization for untrusted content. Keep credentials out of committed configuration. Follow the repository authentication boundary and providers.

## Source references

- [angular/ANGULAR_CODING_STANDARDS.md#3-naming-conventions](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/angular/ANGULAR_CODING_STANDARDS.md#3-naming-conventions)
- [angular/ANGULAR_CODING_STANDARDS.md#4-angular-component-standards](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/angular/ANGULAR_CODING_STANDARDS.md#4-angular-component-standards)
- [angular/ANGULAR_CODING_STANDARDS.md#6-typescript-standards](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/angular/ANGULAR_CODING_STANDARDS.md#6-typescript-standards)
- [angular/ANGULAR_CODING_STANDARDS.md#11-security--accessibility](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/angular/ANGULAR_CODING_STANDARDS.md#11-security--accessibility)

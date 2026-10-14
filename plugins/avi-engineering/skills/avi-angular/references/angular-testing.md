# Angular verification

Maintainer: AVI repository maintainers. Extracted 2026-10-12.
Status is recorded per rule; adopted means carried forward from the source standards, not a new team approval.

## AVI-TEST-001

Status: **adopted**. Applicability: Angular unit tests using AVI Jest conventions.

Preserve the installed runner and setup. AVI class-based tests add the class under test to TestBed providers and inject it, with dependency spies and cleanup of observer subscriptions. Group methods/behaviors with describe; express GIVEN/WHEN/THEN intent. The source convention excludes ComponentFixture for these class tests. If a requested DOM/accessibility behavior requires a different test approach, use an explicit scoped repository exception or identify the unresolved conflict; do not claim a class-only test verifies DOM behavior.

## AVI-TEST-002

Status: **adopted**. Applicability: Behavioral verification.

Test observable behavior, request success/failure and state transitions. Mock HTTP/dependencies with supported installed APIs. Do not imitate source examples that replace framework-managed input signals or assume lifecycle scheduling without verification. Run relevant configured checks and report unavailable or unrun checks.

## AVI-E2E-001

Status: **adopted**. Applicability: Playwright E2E workflows.

Use page objects and fixtures for reusable setup and data. Prefer role/label locators, then stable descriptive data-testid values where appropriate. Isolate test data, assert user-visible flows, and use repository-provided environment/auth setup rather than embedded live credentials.

## Source references

- [angular/ANGULAR_CODING_STANDARDS.md#7-testing-standards](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/angular/ANGULAR_CODING_STANDARDS.md#7-testing-standards)
- [angular/ANGULAR_CODING_STANDARDS.md#8-e2e-testing-with-playwright--page-object-model](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/angular/ANGULAR_CODING_STANDARDS.md#8-e2e-testing-with-playwright--page-object-model)
- [ngrx/TESTING.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ngrx/TESTING.md)

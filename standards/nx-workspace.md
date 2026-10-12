# Nx boundaries, generation and tasks

Maintainer: AVI repository maintainers. Extracted 2026-10-12.
Status is recorded per rule; adopted means carried forward from the source standards, not a new team approval.

## AVI-NX-001

Status: **adopted**. Applicability: Repositories that use Nx.

Separate applications from libraries using the repository's actual layout. Core libraries do not depend on features; features may depend on core and same-domain features; domain-shared libraries depend only on core/utilities. Avoid cross-domain feature imports and circular dependencies. Discover boundary tags and ESLint constraints rather than inventing tag names.

## AVI-NX-002

Status: **adopted**. Applicability: Library public APIs.

Expose each library through its root index.ts public API and configured import alias. Use aliases across library boundaries, not relative deep imports. Add nested barrels only for folders containing more than one non-spec source file; exclude specs from exports.

## AVI-NX-003

Status: **adopted**. Applicability: Scaffolding Nx projects.

Discover suitable local and installed-plugin generators, inspect their schema/source options, specify the actual destination, and review a dry run before generating. Prefer a suitable local generator. Internal libraries default to non-buildable unless an independent build is required. Optional official Nx skills can assist but are not required.

## AVI-NX-004

Status: **adopted**. Applicability: Executing workspace tasks.

Inspect nx.json and resolved project configuration, including inferred targets (for example npx nx show project <project> --json when supported). Use installed Nx and repository package-manager conventions for resolved build/test/lint/serve targets. Verify unfamiliar options with help. Use affected tasks with valid base/head rather than invented flag combinations. Do not impose Nx commands or layout on a non-Nx repository.

## Source references

- [nx/WORKSPACE_STANDARDS.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/nx/WORKSPACE_STANDARDS.md)
- [nx/README.md#workspace-workflow](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/nx/README.md#workspace-workflow)
- [nx/PROJECT_SETUP_GUIDE.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/nx/PROJECT_SETUP_GUIDE.md)
- [nx/RUNNING_TASKS.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/nx/RUNNING_TASKS.md)

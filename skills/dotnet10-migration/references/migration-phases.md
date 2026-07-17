# Migration Plan: Legacy AVI API → .NET 10 gRPC

Throughout this plan, `BusinessDomain` is a fill-in for the overall API name and `Entity` is a fill-in for an entity name. Substitute the actual names supplied at invocation.

## Phase 1: Scaffold Out New API

Generate a new API from the `AVI.gRPC.API.Template`, then reorganize into the destination repo layout per the "Install", "Scaffold", and "Post-Scaffold Reorganization" sections of `template-usage.md`.

## Phase 2: Cleanup Scaffolding

The template generates classes and methods that are not needed for every API. Before migrating any endpoints:

- Remove unneeded generated classes and methods.
- Ensure all namespaces and classes are properly organized and all unused code is removed.
- Ensure each Entity that will be part of the API and has a protobuf definition is declared and plumbed in the Core csproj file.

## Phase 3: Migrate Code One Endpoint at a Time

Migrate one endpoint at a time, starting with the simplest endpoints and working up to the most complex, verifying each endpoint functions correctly before moving to the next.

- All endpoints are migrated to protobuf/gRPC, following the layer structure, gRPC base-class pattern, and proto documentation rules in `conventions.md`.
- All code must be covered by unit tests following the unit test conventions in `conventions.md`.

## Phase 4: Integration Tests (XUnit) and End-to-End Tests (Postman)

Once all endpoints are migrated, test the API thoroughly:

- Build a robust set of XUnit integration tests.
- Write a comprehensive end-to-end test collection in Postman.
- Refine the API as testing surfaces bugs or performance/usability improvements.

## Phase 5: Documentation and Deployment

After testing and refinement:

- Document the API via README.md files.
- Generate the Dockerfile.
- Deploy to production via terraform with helm charts to Kubernetes.

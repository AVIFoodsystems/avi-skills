# AVI.gRPC.API.Template Usage

## Install

The template lives in the AVI.ApiHelpers repo. From a checkout of that repo:

```bash
dotnet new install ./AVI.gRPC.API.Template
```

## Scaffold

Either via Rider (restart Rider after installing the template), or via CLI:

```bash
dotnet new AVIGrpcServer -n BusinessDomain -S Entity
```

- The template's invocation shortName is **`AVIGrpcServer`** (its identity is `AVI.gRPC.API.Template`, but `dotnet new` takes the shortName).
- `-n` — the Business Domain (overall API) name. `dotnet new` substitutes it for the template's `sourceName`, so generated projects are named `BusinessDomain`, `BusinessDomain.BLL`, etc. — **no `AVI.` prefix**. Rename the root web project to `BusinessDomain.API` to match the core-apis convention (see `backend/src/Employees`).
- `-S` — the Main Entity name, used to seed the initial scaffold. Additional entities (typically one per origin controller) are added afterward.

## Post-Scaffold Reorganization

The generated projects must be moved into the destination repo layout:

- Source projects (`BusinessDomain.API`, `BusinessDomain.Core`, `BusinessDomain.BLL`, `BusinessDomain.DAL`) → `/backend/src/BusinessDomain/`
- Test projects (`*.UnitTests`, `*.IntegrationTests`) → `/backend/tests/BusinessDomain/`

After moving, verify solution references and csproj paths still resolve, and that each Entity with a protobuf definition is declared and plumbed in the Core csproj (see Phase 2 in `migration-phases.md`).

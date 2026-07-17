# AVI .NET 10 gRPC API Conventions

These conventions apply to all migrated code. Load this file when writing story acceptance criteria and again in any implementation session.

## Layer and Folder Layout

Each endpoint is segregated across layers, organized into logical modules:

```
/backend/src/
  /BusinessDomain/       (own .sln per domain — see core-apis/backend/src/Employees)
    /BusinessDomain.API/
      /Services/
        EntityGrpcService.cs
          public override EntityDetail GetEntities(GetEntitiesRequest request, ServerCallContext context)
    /BusinessDomain.BLL/
      /Services/
        EntityService.cs
          public EntityDetail GetEntities(GetEntitiesRequest request)
    /BusinessDomain.DAL/
      /Repos/
        EntityRepo.cs
          public EntityDetail GetEntities(GetEntitiesRequest request)
    /BusinessDomain.Core/
      /Models/
        Entity.cs
      /Protos/
        entity.proto
```

## Data Access

- **EF Core is the mandated ORM.** The DAL `Repos/` methods use EF Core by default.
- **ADO.NET is the only sanctioned fallback**, allowed in exactly two cases: executing stored procedures, and writes to tables EF cannot safely track (no primary key and no unique candidate key). Record the fallback decision in the story — never leave it to the implementing agent.
- Migrated domains in core-apis that own their tables (`modernize` strategy, e.g. Employees) legitimately use EF migrations against **their own** schema — do not copy that pattern into a `same-db` migration just because the exemplar has a `Migrations/` folder.
- **The legacy database is an immutable contract under the `same-db` strategy.** EF migrations are disabled; the API never originates schema changes. Never run `dotnet ef migrations` against the legacy database — EF will attempt to add the constraints the schema is missing and fail (or worse) against data that violates them.
- Legacy AVI databases frequently lack primary keys and enforced foreign keys. Every entity mapping decision comes from the schema health check in `database-inventory.md`, expressed in fluent configuration (logical `HasKey`, `HasNoKey`, explicit navigations or their deliberate absence).

## gRPC Service Pattern

- All endpoints are gRPC endpoints. Service classes inherit from the generated gRPC base class (e.g. `EntitiesGrpc.EntitiesGrpcBase`).
- Each endpoint method is a `public override` of the corresponding procedurally generated method in the generated C# class.
- Every rpc, message, and message property in the `.proto` files carries a documentation comment; these surface as OpenAPI documentation through JSON Transcoding.

## Unit Test Conventions

- **One class per method under test.** Split each method under test into its own test class, located in the same folder as the class-under-test's other test files. Name each file after the method under test.
- **Shared setup in an abstract base.** Abstract all code shared between the tests into an abstract class named `<ClassUnderTest>Shared` (e.g. `AdjustmentSalesReasonGrpcServiceShared`).
- **Assertions:** use the Shouldly library.
- **Structure comments:** use uppercase Cucumber-syntax comments to separate test sections: `// GIVEN`, `// WHEN`, `// THEN`.

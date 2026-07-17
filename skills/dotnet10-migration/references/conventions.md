# AVI .NET 10 gRPC API Conventions

These conventions apply to all migrated code. Load this file when writing story acceptance criteria and again in any implementation session.

## Layer and Folder Layout

Each endpoint is segregated across layers, organized into logical modules:

```
/backend/src/
  /BusinessDomain/
    /AVI.BusinessDomain.API/
      /Services/
        EntityGrpcService.cs
          public override EntityDetail GetEntities(GetEntitiesRequest request, ServerCallContext context)
    /AVI.BusinessDomain.BLL/
      /Services/
        EntityService.cs
          public EntityDetail GetEntities(GetEntitiesRequest request)
    /AVI.BusinessDomain.DAL/
      /Repos/
        EntityRepo.cs
          public EntityDetail GetEntities(GetEntitiesRequest request)
    /AVI.BusinessDomain.Core/
      /Models/
        Entity.cs
      /Protos/
        entity.proto
```

## gRPC Service Pattern

- All endpoints are gRPC endpoints. Service classes inherit from the generated gRPC base class (e.g. `EntitiesGrpc.EntitiesGrpcBase`).
- Each endpoint method is a `public override` of the corresponding procedurally generated method in the generated C# class.
- Every rpc, message, and message property in the `.proto` files carries a documentation comment; these surface as OpenAPI documentation through JSON Transcoding.

## Unit Test Conventions

- **One class per method under test.** Split each method under test into its own test class, located in the same folder as the class-under-test's other test files. Name each file after the method under test.
- **Shared setup in an abstract base.** Abstract all code shared between the tests into an abstract class named `<ClassUnderTest>Shared` (e.g. `AdjustmentSalesReasonGrpcServiceShared`).
- **Assertions:** use the Shouldly library.
- **Structure comments:** use uppercase Cucumber-syntax comments to separate test sections: `// GIVEN`, `// WHEN`, `// THEN`.

# Database Inventory

Extract database-resident context that implementing agents cannot discover from a repo checkout: view definitions, stored procedure bodies, actual column types and nullability, computed columns, and triggers. This inventory feeds endpoint complexity ranking and the per-story Database context blocks.

## Step 1: Map Endpoints to Database Objects

From the origin repo's DAL code, list every table, view, stored procedure, and function each endpoint touches. Search for:

- Raw SQL strings and Dapper queries (`FROM`, `JOIN`, `EXEC`, `sp_`)
- EF `DbSet` mappings, `[Table]`/`[Column]` attributes, and `ToTable`/`ToView` fluent config
- `SqlCommand` / `CommandType.StoredProcedure` usages

## Step 2: Extract Definitions

### SQL Server

```sql
-- Columns, types, nullability for a table or view
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH,
       NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '<object>' ORDER BY ORDINAL_POSITION;

-- View or stored procedure definition
EXEC sp_helptext '<object>';
-- or: SELECT OBJECT_DEFINITION(OBJECT_ID('<object>'));

-- Triggers on a table (these make "simple" writes not simple)
SELECT t.name, OBJECT_DEFINITION(t.object_id)
FROM sys.triggers t WHERE t.parent_id = OBJECT_ID('<table>');
```

### PostgreSQL

```sql
-- Columns
SELECT column_name, data_type, is_nullable, numeric_precision, numeric_scale
FROM information_schema.columns WHERE table_name = '<object>';

-- View / function definitions
SELECT pg_get_viewdef('<view>'::regclass, true);
SELECT pg_get_functiondef('<function>'::regproc);
```

If no live database access exists, request a schema export (`.sql` dump or SSMS "Generate Scripts") and extract from that.

## Step 2b: Schema Health Check

Legacy AVI databases frequently lack primary keys and enforced foreign keys. EF Core scaffolding silently skips PK-less tables, and navigations cannot be inferred without FK constraints — so every table gets an explicit health check and a recorded mapping decision **at planning time**, not during implementation.

### Health check queries (SQL Server)

```sql
-- Tables with no primary key
SELECT t.name
FROM sys.tables t
WHERE NOT EXISTS (
  SELECT 1 FROM sys.key_constraints k
  WHERE k.parent_object_id = t.object_id AND k.type = 'PK');

-- Uniqueness probe for a candidate key (must return zero rows
-- before HasKey() may be declared on it)
SELECT <col1>, <col2>, COUNT(*)
FROM <table>
GROUP BY <col1>, <col2>
HAVING COUNT(*) > 1;

-- Orphan probe for an unenforced FK relationship (child rows with no parent)
SELECT COUNT(*) FROM <child> c
LEFT JOIN <parent> p ON c.<fk_col> = p.<pk_col>
WHERE p.<pk_col> IS NULL;
```

Unenforced FK relationships are identified from the DAL code inventory (Step 1 join analysis), not the catalog — the constraints do not exist to query.

### Mapping decision tree (EF Core mandated; ADO.NET fallback)

EF Core is the mandated ORM. Resolve every table to one row of this tree; ADO.NET is permitted only where the tree says so.

| Table reality | Mapping decision |
|---|---|
| Has a real PK | Standard EF entity |
| No PK, candidate key **verified unique** (probe above) | EF entity with logical key: `HasKey()` on the candidate in fluent config — EF needs a logical key; the database never needs the constraint |
| No PK, duplicates exist | `HasNoKey()` keyless entity for reads; **writes via ADO.NET** (sproc or parameterized SQL) — EF cannot track it |
| Unenforced FK, orphan probe clean | EF navigations declared in fluent config; note that the DB will not stop future orphans |
| Unenforced FK, orphans exist | EF entities **without** navigations; explicit LINQ joins with null-tolerant projections |
| Sproc-backed endpoint | ADO.NET (`SqlCommand`, `CommandType.StoredProcedure`) |

Never run `dotnet ef migrations` or any code-first schema operation against the legacy database — under `same-db` it is an immutable contract, and EF would attempt to create the constraints the data violates.

## Step 3: Commit the Schema Snapshot

Write the snapshot to `/backend/docs/db/schema-snapshot.md` in the destination repo and commit it. Stories link to this file — never paste schema dumps into issue bodies, where they drift the moment the schema changes.

Snapshot structure:

```markdown
# Database Schema Snapshot — <BusinessDomain>
> Extracted <date> from <server/database>. Regenerate if schema changes mid-migration.

## Tables
### dbo.Entity
Health: no PK — candidate key `EntityId` verified unique 2026-07-17 · Mapping: EF, `HasKey(EntityId)`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| EntityId | int (identity) | no | logical key (no PK constraint in DB) |
| Amount | decimal(18,4) | yes | |

## Views
### dbo.vw_EntityDetail
Used by: GetEntities, GetEntityById
​```sql
<definition>
​```

## Stored Procedures
### dbo.usp_GetEntities
Used by: GetEntities · ~40 lines · complexity: low
​```sql
<definition>
​```

## Triggers
(any triggers on touched tables, with definitions)
```

## Step 4: Per-Story Database Context Block

Include in each Phase 3 story's **Additional context** section:

```markdown
**Database context**
- Objects touched: `dbo.Entity`, `dbo.vw_EntityDetail`, `dbo.usp_GetEntities`
- Schema snapshot: [/backend/docs/db/schema-snapshot.md](../blob/main/backend/docs/db/schema-snapshot.md)
- Result projection (drives proto message shape):
  | Column | SQL type | Nullable | Proto mapping |
  |---|---|---|---|
  | EntityId | int | no | int32 |
  | Name | nvarchar(100) | no | string |
  | Amount | decimal(18,4) | yes | string (exact decimal; do NOT use double) |
  | ModifiedUtc | datetime2 | yes | google.protobuf.Timestamp |
- Database strategy: same-db — call `usp_GetEntities` unchanged from the DAL repo
- Mapping decision: ADO.NET sproc call for reads; `dbo.Entity` writes via EF with logical key `HasKey(EntityId)` (uniqueness verified 2026-07-17)
```

## Proto Mapping Rules for Lossy Types

Proto messages derive from the **result-set projection**, not the entity table. Apply these mappings and note them in the story:

| SQL type | Proto mapping | Why |
|---|---|---|
| decimal/numeric | `string` (or a shared Money message) | double loses precision on money |
| datetime/datetime2/timestamptz | `google.protobuf.Timestamp` | canonical, UTC-normalized |
| nullable scalar columns | `google.protobuf.*Value` wrappers or `optional` fields | proto3 scalars cannot express null |
| varbinary | `bytes` | |
| uniqueidentifier/uuid | `string` | no native proto GUID |

## Complexity Ranking Input

For each endpoint record: total lines of SQL behind it, number of objects touched, and whether writes hit triggered tables. Feed this into the Phase 3 simplest-first ordering — a three-line controller action over a 400-line stored procedure ranks as complex, and heavy-sproc endpoints should be flagged for splitting into "migrate sproc logic" and "wire endpoint" stories.

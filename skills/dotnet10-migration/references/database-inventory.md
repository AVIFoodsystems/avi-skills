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

## Step 3: Commit the Schema Snapshot

Write the snapshot to `/backend/docs/db/schema-snapshot.md` in the destination repo and commit it. Stories link to this file — never paste schema dumps into issue bodies, where they drift the moment the schema changes.

Snapshot structure:

```markdown
# Database Schema Snapshot — <BusinessDomain>
> Extracted <date> from <server/database>. Regenerate if schema changes mid-migration.

## Tables
### dbo.Entity
| Column | Type | Nullable | Notes |
|---|---|---|---|
| EntityId | int (identity) | no | PK |
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

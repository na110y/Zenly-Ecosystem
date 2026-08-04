paths:

"prisma/**/*"

"server//repositories//*.ts"

"server//repository//*.ts"

"server//persistence//*.ts"

PostgreSQL and Prisma rules

Treat Phase 1/06_DATABASE_SCHEMA.md as canonical before changing schema or persistence.

Prefer database constraints over application-only assumptions: foreign keys, unique constraints, checks, and indexes must reflect the specification.

Make migrations forward-safe, deterministic, and rehearsable from the previous production schema.

Never rewrite an already-applied migration. Add a new migration.

For destructive or large data changes, provide expand/migrate/contract sequencing or an explicit rollback/compensation plan.

Test repository behavior against real PostgreSQL, including duplicate requests, concurrent writes, transaction rollback, and constraint errors.

Do not leak Prisma/database error text to public or admin API consumers.
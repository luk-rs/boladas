# ADR-009: Migration Management Strategy

## Status

Accepted (Updated 2026-01-27)

## Date

2026-01-23 (Updated 2026-01-27)

## Context

As the project scales and multiple environments (local, CI/CD, Production) are involved, handling database schema changes manually or by modifying existing migration files becomes error-prone. Modifying a migration that has already been executed in CI/CD or Production results in a mismatched schema state and can break deployment pipelines.

Additionally, Supabase free tier has strict resource constraints:
- **10-connection limit** maximum concurrent connections
- **Connection pooler limitations**: PgBouncer pooler causes prepared statement conflicts when migrations run repeatedly in CI
- **Database cost**: Free tier cannot support automatic migrations in every CI/CD run

## Decision

We adopt a **two-part migration strategy** optimized for Supabase free tier:

### Part 1: Migration File Management (Immutable Strategy)

1. **Immutability**: Any migration file merged to `main` or applied beyond local development (CI/CD, Production) is **immutable**. Never edit.
2. **Forward-Only Changes**: All database changes (Additions, Modifications, Deletions) via **new** migration files.
3. **Naming Convention**: Supabase timestamp-based: `YYYYMMDDHHMMSS_description.sql`.
4. **Small & Atomic**: Each migration focuses on a single logical change for easier debugging.

### Part 2: Deployment Strategy (Manual Migrations for Free Tier)

Due to free tier connection limits, **migrations are NOT run automatically in CI/CD**:

1. **Manual Push Required**: Developers push migrations to production locally using `bash .github/scripts/push-migrations.sh`
2. **Direct DB Connection**: Script uses direct database connection (port 5432) instead of pooler to avoid prepared statement conflicts
3. **CI/CD App-Only**: Continuous deployment only builds and deploys the app—migrations are pre-applied
4. **Workflow**:
   - Create new migration files locally
   - Test locally with `supabase migration up`
   - Run `bash .github/scripts/push-migrations.sh` with `SUPABASE_PROJECT_ID` and `SUPABASE_DB_PASSWORD`
   - Commit migration files to git
   - Push to `main` — CI deploys app only (migrations already in production database)

## Consequences

### Positive

- **Predictability**: Database state across all environments is consistent with migration file history
- **Traceability**: Every schema change is documented as a distinct event in Git history
- **Free Tier Viable**: Manual migrations avoid connection pool exhaustion and prepared statement conflicts
- **Reliability**: Developers explicitly confirm migrations work before production deployment
- **Simplicity**: CI/CD focuses only on app code, reducing pipeline complexity

### Negative

- **Manual Step Required**: Developers must remember to run `push-migrations.sh` before committing
- **File Proliferation**: `migrations/` directory grows with many small files over time
- **Overhead**: Adding a simple column requires creating a new file
- **Timing Mismatch Risk**: If developer forgets migration push, app changes deploy but DB schema is stale

### Mitigations

- Document workflow clearly in `.docs/AGENTS.md` and `WARP.md`
- Include pre-commit hooks or pull request templates to remind developers
- Keep migration scripts in version control as reference/safety

## Compliance

This ADR complies with the project's requirement to maintain a stable and professional database management workflow.

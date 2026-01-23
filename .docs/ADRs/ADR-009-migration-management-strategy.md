# ADR-009: Migration Management Strategy

## Status

Accepted

## Date

2026-01-23

## Context

As the project scales and multiple environments (local, CI/CD, Production) are involved, handling database schema changes manually or by modifying existing migration files becomes error-prone. Modifying a migration that has already been executed in CI/CD or Production results in a mismatched schema state and can break deployment pipelines.

## Decision

We will adopt a strict, additive migration management strategy:

1.  **Immutability**: Any migration file that has been merged into the `main` branch or applied to any environment beyond local development (e.g., CI/CD, Staging, Production) is considered **immutable**. It must never be edited.
2.  **Forward-Only Changes**: All database changes (Additions, Modifications, Deletions) must be implemented via **new** migration files.
3.  **Naming Convention**: Migrations must follow the Supabase/PostgreSQL timestamp-based naming convention: `YYYYMMDDHHMMSS_description.sql`.
4.  **Local Execution**: Developers must test migrations locally using `supabase migration up` (or equivalent) before pushing to ensure they are reversible (if applicable) and don't break the build.
5.  **Small & Atomic**: Each migration should ideally focus on a single logical change to make debugging and rollback easier.

## Consequences

### Positive

- **Predictability**: The database state across all environments is guaranteed to be consistent with the history of migration files.
- **Traceability**: Every schema change is documented as a distinct event in the Git history.
- **CI/CD Reliability**: Automated pipelines can safely apply new migrations without fear of checksum mismatches or state conflicts.

### Negative

- **File Proliferation**: Over time, the `migrations/` directory will grow with many small files.
- **Overhead**: Adding a simple column requires creating a new file rather than just editing the table definition in the initial schema.

## Compliance

This ADR complies with the project's requirement to maintain a stable and professional database management workflow.

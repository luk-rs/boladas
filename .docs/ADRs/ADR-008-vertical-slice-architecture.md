# ADR-008: Vertical Slice Architecture & Domain Boundaries

## Status

Accepted

## Date

2026-02-16 (updated)

## Context

The initial vertical-slice split improved maintainability, but the `features/teams/dashboard` layer became a cross-domain orchestration surface that coupled same-level business domains (`games`, `convocations`, and team management).

This created unclear ownership and made feature evolution slower because route-level pages depended on a shared dashboard context/composition layer instead of domain-specific contexts.

## Decision

### 1. Same-level domain ownership

Frontend feature ownership is now:

- `features/games`: games listing and game-related accept/cancel flows.
- `features/convocations`: convocations listing, vote/status actions, and convocation creation flow.
- `features/teams`: management-only concerns (roster roles, invites, create/delete/request/admin flows).
- `features/profile`: profile header metrics and profile-specific orchestration.
- `features/team-scope`: shared team membership and active-team state/actions used by all domains.

### 2. Remove dashboard orchestration layer

`features/teams/dashboard` is removed. Its previous responsibilities are split into domain contexts and components under their owning feature slices.

### 3. Shared foundations under `src/shared`

Cross-domain building blocks are consolidated under `src/shared` by shared purpose:

- `shared/layout`
- `shared/ui`
- `shared/api`
- `shared/types`
- `shared/utils`

### 4. URL stability with internal realignment

User-facing routes remain stable (`/games`, `/convocations`, `/teams`, `/profile`, `/admin`) while route components are aligned to the new feature ownership.

### 5. Context API consistency

All new/updated contexts follow the same shape:

- `{ state, actions }`

Temporary adapter hooks are allowed to preserve backward compatibility while imports are migrated.

## Consequences

### Positive

- Clear domain ownership and reduced cross-feature coupling.
- Better scalability for independent feature changes.
- Consistent context API across the app.

### Negative

- Transitional compatibility wrappers add temporary indirection.
- Initial migration requires broader import churn.

## Compliance

This ADR roll-forward supersedes prior `dashboard`-centric composition by defining stable same-level domain boundaries and removing `features/teams/dashboard`.

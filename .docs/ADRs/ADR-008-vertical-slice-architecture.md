# ADR-008: Vertical Slice Architecture

## Status

Accepted

## Date

2026-01-22

## Context

The application is currently structured as a monolithic React component (`App.tsx`) and a single API handler (`index.ts`). As features like Teams, Members, and Auth grow, this structure becomes difficult to maintain. Logic is interleaved, and finding code related to a specific feature requires searching through a large file.

## Decision

We will refactor both the PWA (`apps/boladas`) and the API (`apps/api`) to use a **Vertical Slice Architecture**.

### PWA Structure

Instead of technical layers (components, hooks, containers), we will organize code by **business domain** (features).
Each feature (e.g., `auth`, `teams`, `members`) will be a self-contained directory containing its own:

- UI Components
- State Management (Hooks)
- API Interaction

Shared code (`src/lib`, `src/components/ui`) will be kept to a minimum and used by features.

### API Structure

The Cloudflare Worker API will also be split by feature.

- `src/features/random/`
- `src/features/auth/` (future)
- `src/features/teams/` (future)

## Consequences

### Positive

- **High Cohesion**: Related code is co-located.
- **Scalability**: Easier to add new features without touching unrelated files.
- **Maintainability**: Smaller files and clear boundaries.
- **Team Work**: Different people can work on different features with less conflict.

### Negative

- **Duplication**: Some logic might be duplicated if not careful (though "WET" is preferred over wrong abstractions).
- **Initial Effort**: Requires refactoring the existing monolith.

## Compliance

This ADR complies with the project's requirement to document architectural decisions.

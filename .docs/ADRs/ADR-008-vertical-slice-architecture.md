# ADR-008: Vertical Slice Architecture & Registration Flow

## Status

Accepted

## Date

2026-01-23

## Context

The application structure was monolithic, and the login flow was too permissive. We needed to refactor the architecture for scalability and introduce strict login controls and a team registration flow.

## Decision

### 1. Vertical Slice Architecture

We refactored both the PWA (`apps/boladas`) and API (`apps/api`) to key feature slices:

- **PWA**: `auth`, `teams`, `members`, `install`, `health`.
- **API**: `random`, `team-registration` (via RPC).

### 2. Team Registration Flow

Instead of generic sign-up, users must "Create a Team" to register.

- **Form**: Collects Team Name, Season Start, and Holiday Start.
- **Persistence**: Data is saved to `localStorage` before OAuth redirect.
- **Registration**: On callback, if registration data exists, the `register_team` RPC is called.
- **RPC**: A secure specific PostgreSQL function creates the team and assigns the creator as `team_admin`, `manager`, `secretary`, and `accountant`.

### 3. Login Restrictions

Login is no longer open to everyone.

- **System Admins**: Always allowed.
- **Team Members**: Allowed only if they belong to at least one team.
- **Others**: Access denied immediately upon login.

## Consequences

### Positive

- **Secure Access**: Only authorized team members can access the app.
- **Structured Onboarding**: New users immediately have a context (their team) and roles.
- **Maintainability**: Features are isolated and easy to navigate.

### Negative

- **Complexity**: The auth flow now handles registration data persistence and post-login verification steps.
- **Schema**: Added specific business logic (Season/Holiday start) to the `teams` table.

## Compliance

This ADR documents the architectural changes and the new business rules for access control.

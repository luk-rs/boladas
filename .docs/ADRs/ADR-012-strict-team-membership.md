# ADR-012: Strict Team Membership Requirement

## Status

Accepted

## Context

The domain model of "Boladas" requires that every user be associated with a "Group" or "Team". A user without a team has no context to operate within the application (no games, no stats, no standings).

## Decision

We enforce a **Strict Team Membership Policy**:

1.  **Requirement**: A user **MUST** be a member of at least one team to maintain an active session.
2.  **Enforcement**: The Authentication Logic (`useAuth`) must verify team membership immediately after login.
3.  **Exceptions**:
    - **System Admin**: Exempt from team requirements.
    - **Pending Registration**: If a user has `boladas:registration_data` in LocalStorage, they are allowed temporary access to complete the `register_team` transaction. If this transaction fails or is cancelled, they must be signed out.
    - **Invite Acceptance**: (Future) If a user lands with a valid invite token, they may need temporary access to accept it.

## Implementation Details

- `useAuth.ts` checks `team_members` count.
- If `count === 0` AND no pending registration found -> **Force SignOut**.
- This prevents "Zombie Users" (users with accounts but no teams) from lingering in the system.

## Consequences

- Registration flow must be atomic or robust. If the "Create Team" step fails, the user is logged out, ensuring consistency.
- The "Profile Page" empty state (Add Team button) is only reachable if the user falls into the "Pending Registration" exception or during a graceful failure recovery, but ideally, they shouldn't stay there.

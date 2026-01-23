# ADR-013: Role-Based Access & Backoffice Navigation

## Status

Accepted

## Context

As the application grows, we need to distinguish between "Players" (Members) and "Organizers" (Admins/Managers).
Currently, the Radial Menu mixes navigation for all users. The user requested a clear separation where "Backoffice" (Settings, User Management) actions are distinct and restricted.

## Decision

### 1. Roles & Permissions

We define the following hierarchical scopes:

| Role             | Scope  | Permissions                                   |
| :--------------- | :----- | :-------------------------------------------- |
| **System Admin** | Global | Full Access (Cross-Team)                      |
| **Team Admin**   | Team   | Manage Settings, Invites, Roster, Games       |
| **Manager**      | Team   | Manage Roster, Invites, Games                 |
| **Member**       | Team   | View Stats, Participate in Games, View Roster |

- **Invite Policy**: New invites default to the `member` role. Role upgrades must be performed manually by an Admin.

### 2. Navigation Structure (Radial Menu)

To separate concerns without cluttering the UI, we introduce a **Multi-Ring Radial Menu**:

- **Inner Ring (Primary)**: Visible to ALL. Contains "Play" features (Profile, Games, Stats, Standings).
- **Outer Ring (Backoffice)**: Visible ONLY to `team_admin` / `manager`. Contains management features (Team Settings, Invites, Roster).

### 3. Invite Mechanics

- **Method**: Generic Shareable Links (Token-based).
- **Requirement**: Modifying `public.invites` to allow NULL email addresses.
- **Security**: Tokens are bearer instruments. Anyone with the link can join as a `member`.

## Consequences

- **UI Complexity**: The `RadialMenu` component must support multiple radii and conditional rendering.
- **Database**: Schema migration required for `invites` table.

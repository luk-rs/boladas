# ADR-019: Team Settings and Schedule Management

## Status

Accepted

## Date

2026-10-12

## Context

Teams in Boladas have recurring game definitions (`game_definitions`), season start dates (`season_start`), and holiday dates (`holiday_start`). While these fields were created during initial team registration and utilized by convocation creation (`ConvocationFormPage.tsx`), there was no interface allowing managers and team admins to update them after team creation.

Furthermore, the initial RLS update policy on `public.teams` (`teams_update_owner`) only permitted the original creator (`created_by = auth.uid()`) or system administrators to update rows, preventing promoted team administrators from managing the team configuration.

## Decision

### 1. Updated RLS Policy on `public.teams`

We update the policy on `public.teams` so that:
- System admins (`public.is_system_admin()`),
- Team admins (`public.is_team_admin(id)`),
- Original creators (`created_by = auth.uid()`)
can update team properties (`name`, `season_start`, `holiday_start`, and `game_definitions`).

### 2. Team Settings Section in Team Management

In `TeamManagementPage.tsx`, when an administrator or manager inspects their manageable team:
- A new `TeamSettingsSection` component renders above roster role assignments.
- Admins can edit the team display name.
- Admins can configure the recurring weekly game day and start time via `WheelDayOfWeekPicker` and `WheelTimePicker` bottom sheets.
- Admins can configure the season calendar (start of season and holiday periods) via `WheelDatePicker`.
- Dedicated save action provides inline feedback and optimistic updates.

## Consequences

### Positive
- Squad leaders and team administrators can adapt their team's regular match day and time throughout the season without direct database intervention.
- Role-based permissions remain consistent with existing access controls (`is_team_admin`).
- Preserves the vertical slice architecture pattern.

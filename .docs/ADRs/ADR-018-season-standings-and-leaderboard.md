# ADR-018: Season Standings and Player Leaderboard

## Status

Accepted

## Date

2026-10-12

## Context

ADR-017 introduced the ability to record final scores for games (`shirts_score`, `coletes_score`, `status = 'completed'`, and lineups for shirts and coletes). However, the navigation item `/standings` remained disabled (`disabled: true`), and `StandingsPage.tsx` was an empty placeholder.

Players and managers need a real-time leaderboard for each team displaying:
- Total points (3 for a win, 1 for a draw, 0 for a loss).
- Games played, wins, draws, losses.
- Goals for (GF), goals against (GA), and goal difference (GD).
- Win rate percentage.
- Podium highlights for the top 3 players.

## Decision

### 1. Dynamic Computation from Completed Games

Instead of adding another denormalized table or maintaining points via database triggers, player standings are calculated dynamically from completed games:
- Completed games already contain `shirts_score`, `coletes_score`, `shirts_lineup`, and `coletes_lineup`.
- When scores are recorded or updated by managers, standings immediately reflect the changes with zero risk of desynchronization.
- Guest players (`isGuest: true`) are marked clearly.
- Tied rankings are resolved by points, wins, goal difference, goals scored, fewer games played, and alphabetical order.

### 2. Standings Service Layer

A dedicated service module (`apps/boladas/src/features/teams/services/standings.service.ts`) isolates data retrieval and pure calculation logic:
- `calculateStandingsFromGames()`: pure testable function mapping completed games to player standings and aggregated match statistics (total goals, average goals/match).
- `fetchTeamStandings()`: loads completed games for the active team via Supabase with existing RLS policies.

### 3. Dedicated Mobile-First UI

`StandingsPage.tsx` renders:
- Team selector (when the user participates in multiple teams).
- Quick statistics cards (total completed matches, total goals, average goals/match).
- Visual podium for the top 3 players (1st with leader crown and gold accent, 2nd silver, 3rd bronze).
- Detailed leaderboard table formatted for mobile viewport constraints, with visual highlight for the authenticated user ("Tu").
- Friendly empty state when no completed matches exist yet.
- Enabled in the AppShell radial menu.

## Consequences

### Positive
- Fully operational standings page using existing database tables without schema migrations.
- Reactive and automatically consistent when match results are updated.
- Mobile-first Material Design 3 aesthetic aligned with existing design system.

### Negative
- Standings are computed client-side per team from completed games. For typical amateur football squads (10-50 games/season), compute time is under 1 millisecond.

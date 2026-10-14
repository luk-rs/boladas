# ADR-020: Convocation to Game Transition and Team Shuffle

## Status

Accepted

## Date

2026-10-14

## Context

Convocations gather player availability via votes (ball ⚽, couch 🛋️, hospital 🏥). Once quorum is reached or the manager decides to proceed, the convocation transitions into a game.

Previously:
1. Convocations in `accepted` status did not surface an actionable button to open the team formation screen (`/games/new/:convocationId`), leaving managers stranded if they navigated away.
2. The team formation page (`GameFormPage`) only offered manual drag-and-drop between shirts (camisolas) and coletes, requiring laborious manual sorting for 10–14 players.
3. Convocations that achieved quorum (minimum 10 confirmed players) lacked prominent visual indicators informing managers that the match was ready to be formed.

## Decision

1. **Explicit Team Formation Entry Points**:
   - Convocations with `accepted` status display a primary button "Organizar Equipas" linking to `/games/new/:convocationId`.
   - Open convocations that meet or exceed minimum team members display a quorum achievement badge and a direct action to proceed to team formation.

2. **Team Shuffle / Balance Feature**:
   - Provide a "Sortear Equipas" (🎲) action on `GameFormPage`.
   - The shuffle algorithm pools all currently allocated players (members and guests), shuffles them deterministically or randomly on demand, and splits them evenly between shirts and coletes.
   - Preserves manual drag-and-drop adjustments after shuffling.

3. **Lineup Counts and Status Indicators**:
   - Header labels show live counts for each team (e.g., `👕 Camisolas (5)` vs `🦺 Coletes (5)`).
   - Visual balance indicator highlights when teams are balanced or when an uneven count exists.

## Consequences

### Positive
- Streamlines the transition from availability voting to kickoff-ready match lineups.
- Drastically reduces pre-match organization time with one-click team shuffling.
- Resilient flow allows managers to resume team formation at any time from the convocations list.

### Negative
- Managers must still manually confirm the game creation to commit lineups to the database.

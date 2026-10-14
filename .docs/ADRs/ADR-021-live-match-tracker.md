# ADR-021: Interactive Live Match Tracker

## Status

Accepted

## Date

2026-10-14

## Context

Matches were previously transitioned directly from `scheduled` (kickoff time) to `completed` by manually typing in final scores into `RecordResultSheet`. During the match, players and managers lacked an interactive scoreboard and timer on mobile to track the game live on the pitch.

Because database constraints enforce `status in ('scheduled', 'completed')`, live match tracking can operate seamlessly on the client side without database schema breaking changes, persisting session state (timer and live scores) in local storage and submitting the final result atomically upon match completion via `record_game_result`.

## Decision

1. **Interactive Live Match Screen (`LiveMatchModal`)**:
   - Accessible via the "Iniciar Jogo" (▶️) action on scheduled matches for authorized managers.
   - Features:
     - **Digital Match Clock**: Running timer with Play (▶️) / Pause (⏸️) controls and duration formatting (`MM:SS`).
     - **Interactive Scoreboard**: Quick increment (`+`) and decrement (`-`) buttons for Camisolas 👕 and Coletes 🦺.
     - **Lineup Quick-View**: Roster summary for both sides during match play.
     - **Session Persistence**: Timer and live scores stored in local storage per game id (`boladas_live_game_<id>`) to prevent data loss on browser refresh or accidental tab switch.
2. **Seamless Match Completion**:
   - An "Apito Final / Concluir Jogo" button prompts for final score submission.
   - Upon confirmation, commits the tracked scores directly via `recordGameResult(game.id, scores)`.
   - Clears the live cache and marks the match as `completed` with updated season standings.

## Consequences

### Positive
- Delivers an intuitive pitch-side experience for managers tracking games in real time.
- Preserves backward compatibility with existing backend schema and ADR-017 `record_game_result`.
- Prevents score tracking loss during live play with resilient local persistence.

### Negative
- Multi-device real-time sync during live play is not yet supported (requires web-socket/realtime channel in a future slice).

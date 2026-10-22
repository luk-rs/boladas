# ADR-023: Match Duration, Real-Time Goal Timeline, Collapsible Past Games, Dynamic Form Stats, and Landscape Pitch-Side Tracker

## Context
Following real user testing of the convocation-to-game flow and pitch-side live tracker, five crucial improvements were identified:
1. **Dynamic Form Stats Recalculation**: During team assembly (`/games/new/:id`), dragging players or clicking "Sortear" did not dynamically recalculate the team statistical comparison (Points, Win %, xG, xGA).
2. **Prioritizing Upcoming Scheduled Games**: Past completed matches cluttered the games screen, pushing active/upcoming scheduled matches down. The "Próximo" tag was not clearly prioritizing the next upcoming kickoff.
3. **Match Duration Tracking**: Completed games did not indicate how long the match lasted.
4. **Real-Time Goal Events Timeline**: When using the live match tracker, goals were recorded as aggregate counts without storing the sequence, elapsed match time, and minute of each goal.
5. **Landscape Fullscreen Broadcast Player**: The live match modal needed a broadcast-inspired, stadium scoreboard UI tailored for landscape orientation and full-screen pitch-side monitoring.

## Decision
1. **Dynamic Statistics Aggregate in GameFormContext**:
   - Implemented `calculateTeamAggregate` computing total Points, average Win %, average xG, and xGA deterministically per team.
   - Connected `teamStats` to React dependencies `[teamPlayers.shirts, teamPlayers.coletes]`, enabling instant real-time recalculation on any drag-and-drop or shuffle event.
2. **Scheduled Games Hierarchy & Collapsible Past Games**:
   - Split matches in `GamesSection.tsx` into `scheduledGames` (ordered chronologically by kickoff) and `completedGames`.
   - Placed completed matches inside a collapsible `<details>` expander (`📜 Jogos Anteriores (X)`), keeping the screen clean and focused on active/upcoming games.
   - The first upcoming scheduled game receives the prominent `Próximo` badge.
3. **Database Schema & Worker API for Duration & Events**:
   - Added `duration_seconds integer default null` and `match_events jsonb default '[]'::jsonb` to `public.games`.
   - Updated `record_game_result` stored procedure and Worker API `handleRecordGameResult` to persist match duration and chronological goal events.
   - Updated `list_visible_games` to expose `duration_seconds` and `match_events`.
4. **Landscape Fullscreen Pitch-Side Player (`LiveMatchModal.tsx`)**:
   - Integrated full-screen API toggle (`requestFullscreen`).
   - Designed a 3-column landscape stadium layout:
     - Left: Camisolas (👕) column with giant digital score, touch-friendly `＋ GOLO` and `− Anular` buttons, and player lineup chips.
     - Center: Digital LED stadium timer (`MM:SS`), Play/Pause/Reset controls, live goal events timeline feed (`⚽ 14' Golo Camisolas`), and "🏁 Terminar e Gravar Jogo" action.
     - Right: Coletes (🦺) column with giant digital score, touch-friendly `＋ GOLO` and `− Anular` buttons, and player lineup chips.
   - Displays match duration badge (`⏱️ X min`) and goal chips on completed game cards.

## Consequences
- Pitch-side managers have a dedicated, tactile, full-screen digital scoreboard that feels like a real sports broadcast controller.
- All goals are captured with precise match timestamps and displayed both in the live feed and in the historical match record.
- The games page remains clean and organized, with past matches collapsed by default and upcoming matches front-and-center.

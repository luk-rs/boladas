# ADR-022: Automated Convocation Scheduler and Quorum Tracker

## Status

Accepted

## Date

2026-10-14

## Context

Each team can configure recurring match definitions (`game_definitions`), season start date, and holiday intervals (ADR-019). However, managers previously had to manually open the convocation form every week to schedule each match occurrence. Additionally, managers and players had no clear badge indicating when quorum (minimum 10 confirmed players with ball ⚽) was reached.

## Decision

1. **Automated Convocation Generation**:
   - Provide an automated generation service `POST /convocations/generate-upcoming` in the API worker.
   - For eligible teams with complete rosters (at least 10 members) and defined schedules:
     - Calculates the upcoming kickoff timestamp matching the team's recurring day and time within the 7-day scheduling window.
     - Enforces season and holiday calendar restrictions.
     - Verifies whether an open convocation already exists for the definition key to preserve uniqueness (`convocations_one_open_per_team_definition`).
     - Inserts the new convocation and initializes member availability votes to `couch` (🛋️).
   - Integrates a one-click "Gerar Convocatória Automática" action in the Convocations interface for managers.

2. **Visual Quorum Badges**:
   - Each convocation displays an availability quorum pill:
     - **Quórum Atingido** (Emerald): when confirmed players (`ballVotes.length`) meet or exceed minimum team members.
     - **A Aguardar Quórum** (Amber/Sky): displaying current progress (e.g., `6/10 confirmados`) while voting is ongoing.

## Consequences

### Positive
- Removes repetitive manual data entry for managers by generating matches automatically based on established team schedules.
- Immediately informs team members and managers whether enough players are confirmed for the match to proceed.
- Retains manual date overrides and cancellation paths.

### Negative
- Teams without configured recurring schedules must still create convocations manually.

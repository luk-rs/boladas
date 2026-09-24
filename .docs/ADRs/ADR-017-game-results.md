# ADR-017: Game Results

## Status

Accepted

## Date

2026-09-24

## Context

A game is shirts versus coletes inside one team. The `games` row already stores both lineups, but it has no final score. Managers who can manage convocations (`can_manage_convocation`: system admin, team admin, manager, secretary) need to record that score. Season standings by player are a later slice.

The Worker talks to Postgres with a privileged connection (`SUPABASE_DB_URL`), so row-level security does not apply to those queries. Existing writes (`create_game_from_convocation`, `cancel_game_from_convocation`) are security-definer functions that trust `auth.uid()`, which PostgREST sets from the Supabase access token. The Worker had no equivalent check, and `GET /games` returned a mock.

## Decision

### 1. Result columns

`public.games` gains:

- `shirts_score integer`
- `coletes_score integer`
- `status text` — `scheduled` (default) or `completed`
- `completed_at timestamptz`

A scheduled game has null scores and a null `completed_at`. A completed game has both scores (zero is a real score) and `completed_at`. Status values stay English, consistent with convocation statuses.

### 2. Write path is a security-definer function

`public.record_game_result(game_id, shirts_score, coletes_score)`:

- Requires `auth.uid()`.
- Returns not-found when the caller cannot see the game (same membership rule as `games_select_team`).
- Requires `can_manage_convocation` for the game's team.
- Marks the game `completed` and stores both scores.
- Re-recording replaces the scores and keeps the original `completed_at`.

There is no general `UPDATE` policy on `games`. A broad policy would also let a manager rewrite lineups and `scheduled_at`. Authenticated clients call the function; the Worker does the same after it sets the caller identity.

`public.list_visible_games()` returns games the caller can see. Scheduled games come first, soonest kickoff first. Completed games follow, most recent first. If `auth.uid()` is missing the function returns no rows.

### 3. Worker identity is the Supabase access token

`GET /games` and `PUT /games/:id/result` require `Authorization: Bearer <supabase access token>`.

Verification order, so we do not add a second login system:

1. HS256 with `SUPABASE_JWT_SECRET` when that secret is set.
2. Otherwise GoTrue `GET /auth/v1/user` when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set (covers asymmetric signing keys).
3. Otherwise HS256 with `app.settings.jwt_secret` read from the database (local Supabase sets this).

The verified user id is written to `request.jwt.claims` for the database transaction. That is the same setting `auth.uid()` already reads. The privileged connection is unchanged.

`GET /games` is user-specific and is not publicly cached.

## Consequences

### Positive

- Managers can record and correct a final score without a new role model.
- The games list can show a score and whether the caller may register one (`canRecordResult`).
- A caller who cannot see a game gets 404, not 403, so the write path does not reveal hidden games.

### Negative

- The Worker needs one of the auth configurations above. A deployment with only `SUPABASE_DB_URL` and no JWT secret fails closed with `Missing auth configuration`.
- `GET /games` no longer matches the old mock payload.

## Compliance

Result writes stay on the security-definer path used by convocation game creation. The Worker does not invent a separate user table or role check.

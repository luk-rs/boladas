-- Final score for a shirts vs coletes game.
-- Status vocabulary stays English, same as convocations (open/accepted/dismissed).
-- Writes go through record_game_result() rather than a broad UPDATE policy so a
-- manager cannot rewrite lineups or scheduled_at while recording a score.

alter table public.games
  add column if not exists shirts_score integer,
  add column if not exists coletes_score integer,
  add column if not exists status text not null default 'scheduled',
  add column if not exists completed_at timestamptz;

alter table public.games
  add constraint games_status_check
    check (status in ('scheduled', 'completed')),
  add constraint games_scores_non_negative
    check (
      (shirts_score is null or shirts_score >= 0)
      and (coletes_score is null or coletes_score >= 0)
    ),
  add constraint games_result_shape
    check (
      (
        status = 'scheduled'
        and shirts_score is null
        and coletes_score is null
        and completed_at is null
      )
      or (
        status = 'completed'
        and shirts_score is not null
        and coletes_score is not null
        and completed_at is not null
      )
    );

comment on column public.games.shirts_score is
  'Goals scored by the shirts side. Null while the game is scheduled.';
comment on column public.games.coletes_score is
  'Goals scored by the coletes side. Null while the game is scheduled.';
comment on column public.games.status is
  'scheduled or completed.';
comment on column public.games.completed_at is
  'When the result was first recorded. Kept stable if the score is edited later.';

-- No UPDATE policy: authenticated clients cannot update games directly.
-- record_game_result() is the only write path for a final score.

create or replace function public.record_game_result(
  p_game_id uuid,
  p_shirts_score integer,
  p_coletes_score integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_game jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_shirts_score is null
     or p_coletes_score is null
     or p_shirts_score < 0
     or p_coletes_score < 0 then
    raise exception 'Scores must be non-negative integers' using errcode = '22023';
  end if;

  select g.team_id
    into v_team_id
  from public.games g
  where g.id = p_game_id;

  if v_team_id is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  -- Hide games the caller cannot already see (same rule as games_select_team).
  if not (
    public.is_system_admin()
    or public.user_is_team_member(v_team_id)
  ) then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  if not public.can_manage_convocation(v_team_id) then
    raise exception 'Not authorized to record game result' using errcode = '42501';
  end if;

  -- Re-recording overwrites the score and keeps the original completed_at.
  update public.games
  set
    shirts_score = p_shirts_score,
    coletes_score = p_coletes_score,
    status = 'completed',
    completed_at = coalesce(completed_at, now())
  where id = p_game_id;

  select jsonb_build_object(
    'id', g.id,
    'convocation_id', g.convocation_id,
    'team_id', g.team_id,
    'team_name', t.name,
    'scheduled_at', g.scheduled_at,
    'created_at', g.created_at,
    'status', g.status,
    'shirts_score', g.shirts_score,
    'coletes_score', g.coletes_score,
    'completed_at', g.completed_at,
    'shirts_lineup', g.shirts_lineup,
    'coletes_lineup', g.coletes_lineup,
    'can_record_result', true
  )
    into v_game
  from public.games g
  join public.teams t on t.id = g.team_id
  where g.id = p_game_id;

  return v_game;
end;
$$;

revoke all on function public.record_game_result(uuid, integer, integer) from public;
revoke all on function public.record_game_result(uuid, integer, integer) from anon;
grant execute on function public.record_game_result(uuid, integer, integer) to authenticated;

comment on function public.record_game_result(uuid, integer, integer) is
  'Manager records or replaces the shirts vs coletes final score and marks the game completed.';

-- Worker list. The caller must set request.jwt.claims (auth.uid()) first.
-- If that identity is missing the function returns no rows (fail closed).
create or replace function public.list_visible_games()
returns table (
  id uuid,
  convocation_id uuid,
  team_id uuid,
  team_name text,
  scheduled_at timestamptz,
  created_at timestamptz,
  status text,
  shirts_score integer,
  coletes_score integer,
  completed_at timestamptz,
  shirts_lineup jsonb,
  coletes_lineup jsonb,
  can_record_result boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id,
    g.convocation_id,
    g.team_id,
    t.name,
    g.scheduled_at,
    g.created_at,
    g.status,
    g.shirts_score,
    g.coletes_score,
    g.completed_at,
    g.shirts_lineup,
    g.coletes_lineup,
    public.can_manage_convocation(g.team_id)
  from public.games g
  join public.teams t on t.id = g.team_id
  where public.is_system_admin()
     or public.user_is_team_member(g.team_id)
  order by
    (g.status = 'completed') asc,
    case when g.status = 'completed' then g.scheduled_at end desc,
    g.scheduled_at asc;
$$;

revoke all on function public.list_visible_games() from public;
revoke all on function public.list_visible_games() from anon;
grant execute on function public.list_visible_games() to authenticated;

comment on function public.list_visible_games() is
  'Games visible to the current user: team members and system admins. Scheduled games first (soonest kickoff), then completed games (most recent first).';

alter table public.games
  add column if not exists duration_seconds integer default null,
  add column if not exists match_events jsonb default '[]'::jsonb;

-- Overload or replace record_game_result to support duration and match_events
create or replace function public.record_game_result(
  p_game_id uuid,
  p_shirts_score integer,
  p_coletes_score integer,
  p_duration_seconds integer default null,
  p_match_events jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_game jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_shirts_score < 0 or p_coletes_score < 0 then
    raise exception 'Scores must be non-negative';
  end if;

  select g.team_id
    into v_team_id
  from public.games g
  where g.id = p_game_id;

  if v_team_id is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  if not (
    public.is_system_admin()
    or public.user_is_team_member(v_team_id)
  ) then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  if not public.can_manage_convocation(v_team_id) then
    raise exception 'Not authorized to record game result' using errcode = '42501';
  end if;

  update public.games
  set
    shirts_score = p_shirts_score,
    coletes_score = p_coletes_score,
    duration_seconds = coalesce(p_duration_seconds, duration_seconds),
    match_events = coalesce(p_match_events, match_events),
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
    'duration_seconds', g.duration_seconds,
    'match_events', g.match_events,
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

revoke all on function public.record_game_result(uuid, integer, integer, integer, jsonb) from public;
revoke all on function public.record_game_result(uuid, integer, integer, integer, jsonb) from anon;
grant execute on function public.record_game_result(uuid, integer, integer, integer, jsonb) to authenticated;

drop function if exists public.list_visible_games();

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
  duration_seconds integer,
  match_events jsonb,
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
    g.duration_seconds,
    g.match_events,
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

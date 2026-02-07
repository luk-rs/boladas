-- Backfill legacy teams with invalid/empty game definitions and validate constraint.
with invalid_teams as (
  select
    t.id,
    coalesce(
      (
        select c.scheduled_at
        from public.convocations c
        where c.team_id = t.id
        order by c.scheduled_at desc
        limit 1
      ),
      (
        select g.scheduled_at
        from public.games g
        where g.team_id = t.id
        order by g.scheduled_at desc
        limit 1
      ),
      now()
    ) as fallback_scheduled_at
  from public.teams t
  where not public.is_valid_game_definitions(t.game_definitions)
)
update public.teams t
set game_definitions = jsonb_build_array(
  jsonb_build_object(
    'dayOfWeek', extract(dow from invalid_teams.fallback_scheduled_at)::int,
    'startTime', to_char(invalid_teams.fallback_scheduled_at, 'HH24:MI')
  )
)
from invalid_teams
where t.id = invalid_teams.id;

alter table public.teams
  validate constraint teams_game_definitions_valid;

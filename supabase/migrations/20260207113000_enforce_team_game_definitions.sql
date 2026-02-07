-- Enforce at database level that every team has at least one valid game definition.
create or replace function public.is_valid_game_definitions(p_defs jsonb)
returns boolean
language sql
immutable
as $$
  select
    p_defs is not null
    and jsonb_typeof(p_defs) = 'array'
    and jsonb_array_length(p_defs) > 0
    and not exists (
      select 1
      from jsonb_array_elements(p_defs) as elem
      where jsonb_typeof(elem) <> 'object'
        or not (elem ? 'dayOfWeek')
        or not (elem ? 'startTime')
        or jsonb_typeof(elem->'dayOfWeek') <> 'number'
        or (elem->>'dayOfWeek') !~ '^[0-6](\\.0+)?$'
        or jsonb_typeof(elem->'startTime') <> 'string'
        or not ((elem->>'startTime') ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$')
    );
$$;

alter table public.teams
  alter column game_definitions set default '[]'::jsonb;

alter table public.teams
  alter column game_definitions set not null;

-- Keep as NOT VALID in this migration; backfill + validation runs in a follow-up migration.
alter table public.teams
  add constraint teams_game_definitions_valid
  check (public.is_valid_game_definitions(game_definitions))
  not valid;

create or replace function public.register_team(
  p_name text,
  p_season_start text,
  p_holiday_start text,
  p_game_definitions jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_team_id uuid;
  v_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_valid_game_definitions(p_game_definitions) then
    raise exception 'Team must include at least one valid game definition';
  end if;

  insert into public.teams (name, season_start, holiday_start, game_definitions, created_by)
  values (
    p_name,
    p_season_start::date,
    p_holiday_start::date,
    p_game_definitions,
    auth.uid()
  )
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id)
  values (v_team_id, auth.uid())
  returning id into v_member_id;

  insert into public.team_member_roles (team_member_id, role)
  values (v_member_id, 'member'),
         (v_member_id, 'team_admin'),
         (v_member_id, 'manager'),
         (v_member_id, 'secretary'),
         (v_member_id, 'accountant');

  return v_team_id;
end;
$$;

alter table public.convocations
  add column if not exists game_definition_key text;

update public.convocations
set game_definition_key = concat(
  'legacy:',
  to_char(scheduled_at at time zone 'UTC', 'YYYY-MM-DD'),
  ':',
  to_char(scheduled_at at time zone 'UTC', 'HH24:MI')
)
where game_definition_key is null;

alter table public.convocations
  alter column game_definition_key set not null;

drop index if exists public.convocations_one_open_per_team;

create unique index if not exists convocations_one_open_per_team_definition
  on public.convocations (team_id, game_definition_key)
  where status = 'open';

create or replace function public.create_convocation(
  p_team_id uuid,
  p_title text,
  p_scheduled_at timestamptz,
  p_game_definition_key text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_count int;
  v_min_players int;
  v_convocation_id uuid;
  v_game_definition_key text;
begin
  if not public.can_manage_convocation(p_team_id) then
    raise exception 'Not authorized to create convocation';
  end if;

  select min_players into v_min_players
  from public.teams
  where id = p_team_id;

  if v_min_players is null then
    raise exception 'Team not found';
  end if;

  select count(*) into v_member_count
  from public.team_members
  where team_id = p_team_id;

  if v_member_count < v_min_players then
    raise exception 'Team has only % members (minimum % required)', v_member_count, v_min_players;
  end if;

  v_game_definition_key := nullif(trim(p_game_definition_key), '');
  if v_game_definition_key is null then
    v_game_definition_key := concat(
      'legacy:',
      to_char(p_scheduled_at at time zone 'UTC', 'YYYY-MM-DD'),
      ':',
      to_char(p_scheduled_at at time zone 'UTC', 'HH24:MI')
    );
  end if;

  update public.convocations
  set status = 'dismissed'
  where team_id = p_team_id
    and status = 'open'
    and game_definition_key = v_game_definition_key;

  insert into public.convocations (
    team_id,
    title,
    scheduled_at,
    status,
    created_by,
    game_definition_key
  )
  values (
    p_team_id,
    p_title,
    p_scheduled_at,
    'open',
    auth.uid(),
    v_game_definition_key
  )
  returning id into v_convocation_id;

  insert into public.convocation_votes (convocation_id, user_id, state)
  select v_convocation_id, tm.user_id, 'couch'
  from public.team_members tm
  where tm.team_id = p_team_id;

  return v_convocation_id;
end;
$$;

grant execute on function public.create_convocation(uuid, text, timestamptz, text) to authenticated;

create or replace function public.set_convocation_status(
  p_convocation_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_scheduled_at timestamptz;
  v_current_status text;
  v_game_definition_key text;
begin
  if p_status not in ('open', 'accepted', 'dismissed') then
    raise exception 'Invalid status';
  end if;

  select team_id, scheduled_at, status, game_definition_key
    into v_team_id, v_scheduled_at, v_current_status, v_game_definition_key
  from public.convocations
  where id = p_convocation_id;

  if v_team_id is null then
    raise exception 'Convocation not found';
  end if;

  if not public.can_manage_convocation(v_team_id) then
    raise exception 'Not authorized to update convocation';
  end if;

  if p_status = v_current_status then
    return;
  end if;

  if p_status = 'open' then
    if v_current_status not in ('dismissed', 'accepted') then
      raise exception 'Only closed convocations can be reopened';
    end if;

    if v_scheduled_at <= now() then
      raise exception 'Cannot reopen after scheduled time';
    end if;

    if exists (
      select 1
      from public.convocations
      where team_id = v_team_id
        and game_definition_key = v_game_definition_key
        and status = 'open'
        and id <> p_convocation_id
    ) then
      raise exception 'An open convocation already exists for this game definition';
    end if;
  elsif v_current_status = 'open' then
    null;
  elsif v_current_status = 'accepted' and p_status = 'dismissed' then
    null;
  else
    raise exception 'Invalid status transition';
  end if;

  update public.convocations
    set status = p_status
  where id = p_convocation_id;
end;
$$;

grant execute on function public.set_convocation_status(uuid, text) to authenticated;

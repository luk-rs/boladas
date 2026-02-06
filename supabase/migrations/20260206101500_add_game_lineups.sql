alter table public.games
  add column if not exists shirts_lineup jsonb not null default '[]'::jsonb,
  add column if not exists coletes_lineup jsonb not null default '[]'::jsonb;

create or replace function public.create_game_from_convocation_with_teams(
  p_convocation_id uuid,
  p_scheduled_at timestamptz default null,
  p_shirts jsonb default '[]'::jsonb,
  p_coletes jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_scheduled_at timestamptz;
  v_status text;
  v_game_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if jsonb_typeof(coalesce(p_shirts, '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid shirts lineup payload';
  end if;

  if jsonb_typeof(coalesce(p_coletes, '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid coletes lineup payload';
  end if;

  select team_id, scheduled_at, status
    into v_team_id, v_scheduled_at, v_status
  from public.convocations
  where id = p_convocation_id;

  if v_team_id is null then
    raise exception 'Convocation not found';
  end if;

  if not public.can_manage_convocation(v_team_id) then
    raise exception 'Not authorized to create game';
  end if;

  if v_status <> 'accepted' then
    raise exception 'Convocation must be accepted';
  end if;

  if exists (
    select 1
    from public.games
    where convocation_id = p_convocation_id
  ) then
    raise exception 'Game already exists for this convocation';
  end if;

  v_scheduled_at := coalesce(p_scheduled_at, v_scheduled_at);
  if v_scheduled_at is null then
    raise exception 'Scheduled time is required';
  end if;

  insert into public.games (
    convocation_id,
    team_id,
    scheduled_at,
    created_by,
    shirts_lineup,
    coletes_lineup
  )
  values (
    p_convocation_id,
    v_team_id,
    v_scheduled_at,
    auth.uid(),
    coalesce(p_shirts, '[]'::jsonb),
    coalesce(p_coletes, '[]'::jsonb)
  )
  returning id into v_game_id;

  return v_game_id;
end;
$$;

grant execute on function public.create_game_from_convocation_with_teams(uuid, timestamptz, jsonb, jsonb) to authenticated;

-- Games table and helpers
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  convocation_id uuid unique references public.convocations(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete cascade,
  scheduled_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "games_select_team"
  on public.games
  for select
  using (
    public.is_system_admin()
    or exists (
      select 1
      from public.team_members tm
      where tm.team_id = team_id
        and tm.user_id = auth.uid()
    )
  );

create policy "games_insert_manage_team"
  on public.games
  for insert
  with check (
    public.is_system_admin()
    or public.can_manage_convocation(team_id)
  );

create or replace function public.create_game_from_convocation(
  p_convocation_id uuid,
  p_scheduled_at timestamptz default null
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

  insert into public.games (convocation_id, team_id, scheduled_at, created_by)
  values (p_convocation_id, v_team_id, v_scheduled_at, auth.uid())
  returning id into v_game_id;

  return v_game_id;
end;
$$;

grant execute on function public.create_game_from_convocation(uuid, timestamptz) to authenticated;

-- Allow reopening accepted convocations (e.g., game dismissed)
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
begin
  if p_status not in ('open', 'accepted', 'dismissed') then
    raise exception 'Invalid status';
  end if;

  select team_id, scheduled_at, status
    into v_team_id, v_scheduled_at, v_current_status
  from public.convocations
  where id = p_convocation_id;

  if v_team_id is null then
    raise exception 'Convocation not found';
  end if;

  if not public.can_manage_convocation(v_team_id) then
    raise exception 'Not authorized to update convocation';
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
        and status = 'open'
        and id <> p_convocation_id
    ) then
      raise exception 'An open convocation already exists for this team';
    end if;
  elsif v_current_status <> 'open' then
    raise exception 'Only open convocations can be closed';
  end if;

  update public.convocations
    set status = p_status
  where id = p_convocation_id;
end;
$$;

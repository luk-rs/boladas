-- Add minimum players per team (default 10 for now)
alter table public.teams
  add column if not exists min_players integer not null default 10;

-- Convocations (team call-ups)
create table if not exists public.convocations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text,
  scheduled_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open', 'accepted', 'dismissed')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists convocations_one_open_per_team
  on public.convocations (team_id)
  where status = 'open';

-- Convocation votes (one per user, default state is couch)
create table if not exists public.convocation_votes (
  id uuid primary key default gen_random_uuid(),
  convocation_id uuid not null references public.convocations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null default 'couch'
    check (state in ('ball', 'couch', 'hospital')),
  created_at timestamptz not null default now(),
  unique (convocation_id, user_id)
);

create index if not exists convocation_votes_convocation_id_idx
  on public.convocation_votes (convocation_id);

create index if not exists convocation_votes_user_id_idx
  on public.convocation_votes (user_id);

alter table public.convocations enable row level security;
alter table public.convocation_votes enable row level security;

create or replace function public.can_manage_convocation(p_team_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_system_admin()
     or exists (
       select 1
       from public.team_members tm
       join public.team_member_roles tmr on tmr.team_member_id = tm.id
       where tm.team_id = p_team_id
         and tm.user_id = auth.uid()
         and tmr.role in ('team_admin', 'manager', 'secretary')
     );
$$;

create or replace function public.create_convocation(
  p_team_id uuid,
  p_title text,
  p_scheduled_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_count int;
  v_min_players int;
  v_convocation_id uuid;
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

  if exists (
    select 1
    from public.convocations
    where team_id = p_team_id
      and status = 'open'
  ) then
    raise exception 'An open convocation already exists for this team';
  end if;

  insert into public.convocations (team_id, title, scheduled_at, status, created_by)
  values (p_team_id, p_title, p_scheduled_at, 'open', auth.uid())
  returning id into v_convocation_id;

  insert into public.convocation_votes (convocation_id, user_id, state)
  select v_convocation_id, tm.user_id, 'couch'
  from public.team_members tm
  where tm.team_id = p_team_id;

  return v_convocation_id;
end;
$$;

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
    if v_current_status <> 'dismissed' then
      raise exception 'Only dismissed convocations can be reopened';
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

create policy "convocations_select_team"
  on public.convocations
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

create policy "convocation_votes_select_team"
  on public.convocation_votes
  for select
  using (
    public.is_system_admin()
    or exists (
      select 1
      from public.team_members tm
      join public.convocations c on c.team_id = tm.team_id
      where tm.user_id = auth.uid()
        and c.id = convocation_id
    )
  );

create policy "convocation_votes_update_own_open"
  on public.convocation_votes
  for update
  using (
    public.is_system_admin()
    or (
      user_id = auth.uid()
      and exists (
        select 1
        from public.convocations c
        where c.id = convocation_id
          and c.status = 'open'
      )
    )
  )
  with check (
    public.is_system_admin()
    or (
      user_id = auth.uid()
      and exists (
        select 1
        from public.convocations c
        where c.id = convocation_id
          and c.status = 'open'
      )
    )
  );

grant execute on function public.create_convocation(uuid, text, timestamptz) to authenticated;
grant execute on function public.set_convocation_status(uuid, text) to authenticated;

-- Apply schema + performance optimizations:
-- 1) Fix RLS policy scoping bugs on convocations/games.
-- 2) Ensure optimized helper functions are present.
-- 3) Make approve_team_request compatible with current team constraints.
-- 4) Add high-value composite/partial indexes for app query patterns.
-- 5) Remove redundant token index (unique constraint already covers it).

-- ---------------------------------------------------------------------------
-- 1) RLS policy fixes
-- ---------------------------------------------------------------------------

drop policy if exists "convocations_select_team" on public.convocations;
create policy "convocations_select_team"
  on public.convocations
  for select
  using (
    public.is_system_admin()
    or exists (
      select 1
      from public.team_members tm
      where tm.team_id = public.convocations.team_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists "games_select_team" on public.games;
create policy "games_select_team"
  on public.games
  for select
  using (
    public.is_system_admin()
    or exists (
      select 1
      from public.team_members tm
      where tm.team_id = public.games.team_id
        and tm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Function hardening/optimizations
-- ---------------------------------------------------------------------------

create or replace function public.can_view_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    case
      when exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and is_system_admin = true
      ) then true
      when exists (
        select 1
        from public.team_members tm_viewer
        join public.team_member_roles tmr_viewer
          on tmr_viewer.team_member_id = tm_viewer.id
         and tmr_viewer.role = 'team_admin'
        join public.team_members tm_target
          on tm_target.team_id = tm_viewer.team_id
        where tm_viewer.user_id = auth.uid()
          and tm_target.user_id = p_user_id
      ) then true
      else false
    end;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invite public.invites%rowtype;
  v_team_member_id uuid;
  v_email text;
  v_user_id uuid;
  v_existing_member_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email
  from auth.users
  where id = v_user_id;

  if v_email is null then
    raise exception 'Missing user email';
  end if;

  select * into v_invite
  from public.invites
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    raise exception 'Invite invalid or expired';
  end if;

  if lower(v_invite.email) <> lower(v_email) then
    raise exception 'Invite email mismatch';
  end if;

  insert into public.profiles (id, email, display_name)
  select
    u.id,
    u.email,
    coalesce(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      u.email
    )
  from auth.users u
  where u.id = v_user_id
  on conflict (id) do nothing;

  select id into v_existing_member_id
  from public.team_members
  where team_id = v_invite.team_id
    and user_id = v_user_id;

  if v_existing_member_id is not null then
    v_team_member_id := v_existing_member_id;

    delete from public.team_member_roles
    where team_member_id = v_team_member_id
      and role != all(v_invite.roles);

    insert into public.team_member_roles (team_member_id, role)
    select v_team_member_id, unnest(v_invite.roles)
    on conflict (team_member_id, role) do nothing;
  else
    insert into public.team_members (team_id, user_id)
    values (v_invite.team_id, v_user_id)
    returning id into v_team_member_id;

    insert into public.team_member_roles (team_member_id, role)
    select v_team_member_id, unnest(v_invite.roles)
    on conflict (team_member_id, role) do nothing;
  end if;

  update public.invites
  set accepted_at = now(),
      accepted_by = v_user_id
  where id = v_invite.id;

  return v_invite.team_id;
end;
$$;

create or replace function public.approve_team_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_req public.team_requests%rowtype;
  v_team_id uuid;
  v_member_id uuid;
  v_default_game_defs jsonb := jsonb_build_array(
    jsonb_build_object('dayOfWeek', 1, 'startTime', '19:00')
  );
begin
  if not public.is_system_admin() then
    raise exception 'Not authorized';
  end if;

  select *
    into v_req
  from public.team_requests
  where id = p_request_id
    and status = 'pending';

  if not found then
    raise exception 'Request not found or already processed';
  end if;

  insert into public.teams (name, created_by, game_definitions)
  values (v_req.name, v_req.requested_by, v_default_game_defs)
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id)
  values (v_team_id, v_req.requested_by)
  returning id into v_member_id;

  insert into public.team_member_roles (team_member_id, role)
  values
    (v_member_id, 'member'),
    (v_member_id, 'team_admin'),
    (v_member_id, 'manager'),
    (v_member_id, 'secretary'),
    (v_member_id, 'accountant')
  on conflict (team_member_id, role) do nothing;

  update public.team_requests
  set status = 'approved'
  where id = p_request_id;

  return v_team_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Indexing improvements
-- ---------------------------------------------------------------------------

create index if not exists idx_convocations_team_id_scheduled_at
  on public.convocations (team_id, scheduled_at);

create index if not exists idx_games_team_id_scheduled_at
  on public.games (team_id, scheduled_at);

create index if not exists idx_team_members_team_id_created_at
  on public.team_members (team_id, created_at);

create index if not exists idx_team_requests_requested_by_created_at
  on public.team_requests (requested_by, created_at);

create index if not exists idx_team_requests_status_created_at
  on public.team_requests (status, created_at);

create index if not exists idx_invites_team_id_pending
  on public.invites (team_id)
  where accepted_at is null;

create index if not exists idx_team_member_roles_role_team_member_id
  on public.team_member_roles (role, team_member_id);

drop index if exists public.idx_invites_token;

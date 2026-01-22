-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Profiles (one per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  is_system_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Teams
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Team members
create table if not exists public.team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);
-- Roles
create table if not exists public.roles (
  name text primary key,
  kind text not null check (kind in ('base', 'extra'))
);

insert into public.roles (name, kind) values
  ('member', 'base'),
  ('player', 'base'),
  ('manager', 'extra'),
  ('secretary', 'extra'),
  ('accountant', 'extra'),
  ('team_admin', 'extra')
on conflict do nothing;

-- Team member roles (multi-role)
create table if not exists public.team_member_roles (
  id uuid primary key default uuid_generate_v4(),
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  role text not null references public.roles(name) on delete restrict,
  created_at timestamptz not null default now(),
  unique (team_member_id, role)
);

-- Invites
create table if not exists public.invites (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  token text not null unique,
  roles text[] not null,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);
-- Team creation requests (pending approval by system admin)
create table if not exists public.team_requests (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.roles enable row level security;
alter table public.team_member_roles enable row level security;
alter table public.invites enable row level security;
alter table public.team_requests enable row level security;

create or replace function public.is_system_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select is_system_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_team_admin(p_team_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.team_members tm
    join public.team_member_roles tmr on tmr.team_member_id = tm.id
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tmr.role = 'team_admin'
  );
$$;

create or replace function public.can_manage_team(p_team_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_system_admin()
     or public.is_team_admin(p_team_id)
     or exists (select 1 from public.teams t where t.id = p_team_id and t.created_by = auth.uid());
$$;

create or replace function public.can_view_profile(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_system_admin()
     or exists (
       select 1
       from public.team_members tm_self
       join public.team_member_roles tmr on tmr.team_member_id = tm_self.id and tmr.role = 'team_admin'
       join public.team_members tm_other on tm_other.team_id = tm_self.team_id
       where tm_self.user_id = auth.uid() and tm_other.user_id = p_user_id
     );
$$;

create or replace function public.invite_has_valid_base_role(p_roles text[])
returns boolean
language sql
stable
as $$
  select (
    (case when 'member' = any(p_roles) then 1 else 0 end) +
    (case when 'player' = any(p_roles) then 1 else 0 end)
  ) = 1;
$$;

alter table public.invites
  add constraint invites_require_base_role check (public.invite_has_valid_base_role(roles));

create or replace function public.validate_invite_roles()
returns trigger
language plpgsql
as $$
declare
  invalid_count integer;
begin
  select count(*) into invalid_count
  from unnest(new.roles) r
  left join public.roles rr on rr.name = r
  where rr.name is null;

  if invalid_count > 0 then
    raise exception 'Invite roles contain invalid values';
  end if;

  return new;
end;
$$;

create or replace function public.create_team_request(p_name text)
returns public.team_requests
language plpgsql
security definer
as $$
declare
  v_req public.team_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  insert into public.team_requests (name, requested_by)
  values (p_name, auth.uid())
  returning * into v_req;
  return v_req;
end;
$$;

create or replace function public.approve_team_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_req public.team_requests%rowtype;
  v_team_id uuid;
  v_member_id uuid;
begin
  if not public.is_system_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_req from public.team_requests
  where id = p_request_id and status = 'pending';

  if not found then
    raise exception 'Request not found or already processed';
  end if;

  insert into public.teams (name, created_by)
  values (v_req.name, v_req.requested_by)
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id)
  values (v_team_id, v_req.requested_by)
  returning id into v_member_id;

  insert into public.team_member_roles (team_member_id, role)
  values (v_member_id, 'member')
  on conflict do nothing;

  insert into public.team_member_roles (team_member_id, role)
  values (v_member_id, 'team_admin')
  on conflict do nothing;

  update public.team_requests
  set status = 'approved'
  where id = p_request_id;

  return v_team_id;
end;
$$;

create or replace function public.deny_team_request(p_request_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_system_admin() then
    raise exception 'Not authorized';
  end if;
  update public.team_requests
  set status = 'denied'
  where id = p_request_id and status = 'pending';
end;
$$;

drop trigger if exists trg_validate_invite_roles on public.invites;
create trigger trg_validate_invite_roles
before insert or update on public.invites
for each row execute function public.validate_invite_roles();

create or replace function public.enforce_base_role()
returns trigger
language plpgsql
as $$
declare
  base_count integer;
  target_id uuid;
begin
  target_id := coalesce(new.team_member_id, old.team_member_id);
  select count(*) into base_count
  from public.team_member_roles tmr
  join public.roles r on r.name = tmr.role
  where tmr.team_member_id = target_id and r.kind = 'base';

  if base_count <> 1 then
    raise exception 'Each team member must have exactly one base role (member or player).';
  end if;

  return null;
end;
$$;

drop trigger if exists trg_enforce_base_role on public.team_member_roles;
create constraint trigger trg_enforce_base_role
after insert or update or delete on public.team_member_roles
deferrable initially deferred
for each row execute function public.enforce_base_role();

create or replace function public.enforce_max_team_admins()
returns trigger
language plpgsql
as $$
declare
  team_id uuid;
  admin_count integer;
begin
  select tm.team_id into team_id
  from public.team_members tm
  where tm.id = coalesce(new.team_member_id, old.team_member_id);

  select count(*) into admin_count
  from public.team_members tm
  join public.team_member_roles tmr on tmr.team_member_id = tm.id
  where tm.team_id = team_id and tmr.role = 'team_admin';

  if admin_count > 3 then
    raise exception 'Max 3 team admins per team.';
  end if;

  return null;
end;
$$;

drop trigger if exists trg_enforce_max_team_admins on public.team_member_roles;
create constraint trigger trg_enforce_max_team_admins
after insert or update or delete on public.team_member_roles
deferrable initially deferred
for each row execute function public.enforce_max_team_admins();

create or replace function public.set_base_role(p_team_member_id uuid, p_role text)
returns void
language plpgsql
security definer
as $$
declare
  tm public.team_members%rowtype;
begin
  if p_role not in ('member', 'player') then
    raise exception 'Invalid base role';
  end if;

  select * into tm from public.team_members where id = p_team_member_id;
  if not found then
    raise exception 'Team member not found';
  end if;

  if tm.user_id <> auth.uid() and not public.can_manage_team(tm.team_id) then
    raise exception 'Not authorized';
  end if;

  delete from public.team_member_roles
  where team_member_id = p_team_member_id and role in ('member', 'player');

  insert into public.team_member_roles (team_member_id, role)
  values (p_team_member_id, p_role)
  on conflict do nothing;
end;
$$;

create or replace function public.create_invite(
  p_team_id uuid,
  p_email text,
  p_roles text[],
  p_expires_at timestamptz
)
returns public.invites
language plpgsql
security definer
as $$
declare
  v_invite public.invites%rowtype;
begin
  if not public.can_manage_team(p_team_id) then
    raise exception 'Not authorized';
  end if;

  if not public.invite_has_valid_base_role(p_roles) then
    raise exception 'Invite must include exactly one base role';
  end if;

  insert into public.invites (team_id, email, token, roles, expires_at, created_by)
  values (p_team_id, p_email, gen_random_uuid()::text, p_roles, p_expires_at, auth.uid())
  returning * into v_invite;

  return v_invite;
end;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_invite public.invites%rowtype;
  v_team_member_id uuid;
  v_email text;
begin
  v_email := (select email from auth.users where id = auth.uid());
  if v_email is null then
    raise exception 'Missing user email';
  end if;

  select * into v_invite
  from public.invites
  where token = p_token and accepted_at is null and expires_at > now();

  if not found then
    raise exception 'Invite invalid or expired';
  end if;

  if lower(v_invite.email) <> lower(v_email) then
    raise exception 'Invite email mismatch';
  end if;

  insert into public.team_members (team_id, user_id)
  values (v_invite.team_id, auth.uid())
  on conflict (team_id, user_id) do update set team_id = excluded.team_id
  returning id into v_team_member_id;

  insert into public.team_member_roles (team_member_id, role)
  select v_team_member_id, r from unnest(v_invite.roles) r
  on conflict do nothing;

  update public.invites
  set accepted_at = now(), accepted_by = auth.uid()
  where id = v_invite.id;

  return v_invite.team_id;
end;
$$;

-- Profiles: owner can read/write
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

create policy "profiles_select_system_admin"
  on public.profiles for select
  using (public.is_system_admin());

create policy "profiles_update_system_admin"
  on public.profiles for update
  using (public.is_system_admin());

create policy "profiles_select_team_admin"
  on public.profiles for select
  using (public.can_view_profile(id));

-- Teams: members can read, creators can insert/update/delete
create policy "teams_select_members"
  on public.teams for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = id and tm.user_id = auth.uid()
    )
  );
create policy "teams_select_system_admin"
  on public.teams for select
  using (public.is_system_admin());

create policy "teams_insert_owner"
  on public.teams for insert
  with check (created_by = auth.uid());
create policy "teams_update_system_admin"
create policy "teams_update_owner"
  on public.teams for update
  using (public.is_system_admin());

create policy "teams_delete_system_admin"
  on public.teams for delete
  using (public.is_system_admin());

-- Team members: members can read, admins can manage
create policy "team_members_select_team"
  on public.team_members for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_id and tm.user_id = auth.uid()
    )
  );
create policy "team_members_select_admin"
  on public.team_members for select
  using (public.can_manage_team(team_id));

create policy "team_members_insert_admin"
  on public.team_members for insert
  with check (public.can_manage_team(team_id));

create policy "team_members_update_admin"
  on public.team_members for update
  using (public.can_manage_team(team_id));

create policy "team_members_delete_admin"
  on public.team_members for delete
  using (public.can_manage_team(team_id));

-- Roles: readable to all authenticated users
create policy "roles_select_all"
  on public.roles for select
  using (auth.role() = 'authenticated');

-- Team member roles: members can read, admins can manage
create policy "team_member_roles_select_team"
  on public.team_member_roles for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = team_member_id and tm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.team_members tm
      where tm.id = team_member_id and public.can_manage_team(tm.team_id)
    )
  );

create policy "team_member_roles_manage_admin"
  on public.team_member_roles for insert
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = team_member_id and public.can_manage_team(tm.team_id)
    )
  );

create policy "team_member_roles_update_admin"
  on public.team_member_roles for update
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = team_member_id and public.can_manage_team(tm.team_id)
    )
  );

create policy "team_member_roles_delete_admin"
  on public.team_member_roles for delete
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = team_member_id and public.can_manage_team(tm.team_id)
    )
  );

-- Invites: team admins and system admins can manage
create policy "invites_select_admin"
  on public.invites for select
  using (public.can_manage_team(team_id));

create policy "invites_insert_admin"
  on public.invites for insert
  with check (public.can_manage_team(team_id));

create policy "invites_update_admin"
  on public.invites for update
  using (public.can_manage_team(team_id));

create policy "invites_delete_admin"
  on public.invites for delete
  using (public.can_manage_team(team_id));

-- Team requests: users can create/read own; system admins manage all
create policy "team_requests_select_own"
  on public.team_requests for select
  using (requested_by = auth.uid());

create policy "team_requests_insert_own"
  on public.team_requests for insert
  with check (requested_by = auth.uid());

create policy "team_requests_select_admin"
  on public.team_requests for select
  using (public.is_system_admin());

create policy "team_requests_update_admin"
  on public.team_requests for update
  using (public.is_system_admin());

create policy "team_requests_delete_admin"
  on public.team_requests for delete
  using (public.is_system_admin());

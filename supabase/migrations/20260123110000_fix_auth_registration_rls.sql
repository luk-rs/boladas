-- 1. Security Definer for Admin Check Functions (Resolves RLS Recursion)
create or replace function public.is_system_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select is_system_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_team_admin(p_team_id uuid)
returns boolean
language sql
security definer
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

-- 2. Trigger Fixes (Ambiguity and Deletion Handling)
create or replace function public.enforce_base_role()
returns trigger
language plpgsql
security definer
as $$
declare
  base_count integer;
  target_id uuid;
begin
  target_id := coalesce(new.team_member_id, old.team_member_id);

  -- Detailed check: if member was deleted, skip validation
  if not exists (select 1 from public.team_members where id = target_id) then
    return null;
  end if;

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

create or replace function public.enforce_max_team_admins()
returns trigger
language plpgsql
security definer
as $$
declare
  v_team_id uuid;
  v_admin_count integer;
begin
  select tm.team_id into v_team_id
  from public.team_members tm
  where tm.id = coalesce(new.team_member_id, old.team_member_id);

  select count(*) into v_admin_count
  from public.team_members tm
  join public.team_member_roles tmr on tmr.team_member_id = tm.id
  where tm.team_id = v_team_id and tmr.role = 'team_admin';

  if v_admin_count > 3 then
    raise exception 'Max 3 team admins per team.';
  end if;

  return null;
end;
$$;

-- 3. RLS Policy Fixes
-- Profiles: Allow users to insert their own profile during registration
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

-- Teams: Fix ambiguous column name in membership check
drop policy "teams_select_members" on public.teams;
create policy "teams_select_members"
  on public.teams for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = teams.id and tm.user_id = auth.uid()
    )
  );

-- Team members: Allow users to see their own membership (breaks recursion)
create policy "team_members_select_own"
  on public.team_members for select
  using (user_id = auth.uid());

-- Team member roles: Correct policies for role management and visibility
drop policy if exists "team_member_roles_select_team" on public.team_member_roles;
drop policy if exists "team_member_roles_manage_admin" on public.team_member_roles;
drop policy if exists "team_member_roles_update_admin" on public.team_member_roles;
drop policy if exists "team_member_roles_delete_admin" on public.team_member_roles;

create policy "team_member_roles_select_own"
  on public.team_member_roles for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = team_member_roles.team_member_id
      and tm.user_id = auth.uid()
    )
  );

create policy "team_member_roles_manage_admin"
  on public.team_member_roles for all
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = team_member_roles.team_member_id
      and public.can_manage_team(tm.team_id)
    )
  );

create policy "team_member_roles_insert_admin"
  on public.team_member_roles for insert
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = team_member_roles.team_member_id
      and public.can_manage_team(tm.team_id)
    )
  );

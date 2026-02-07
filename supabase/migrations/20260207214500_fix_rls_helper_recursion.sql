-- Fix stack-depth recursion in RLS helper evaluation.
-- Root cause:
-- - can_manage_team was SECURITY INVOKER and queried public.teams.
-- - teams RLS evaluation can read team_members, which references can_manage_team again.
-- - This can recurse deeply under authenticated role and fail with:
--   "stack depth limit exceeded".
--
-- This migration hardens helper functions used by policies/RPCs so they execute
-- as SECURITY DEFINER with explicit search_path and bypass recursive RLS chains.

create or replace function public.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (
      select p.is_system_admin
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.user_is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_admin(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.team_members tm
    join public.team_member_roles tmr
      on tmr.team_member_id = tm.id
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tmr.role = 'team_admin'
  );
$$;

create or replace function public.can_manage_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_system_admin()
     or public.is_team_admin(p_team_id)
     or exists (
       select 1
       from public.teams t
       where t.id = p_team_id
         and t.created_by = auth.uid()
     );
$$;

create or replace function public.can_manage_convocation(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_system_admin()
     or exists (
       select 1
       from public.team_members tm
       join public.team_member_roles tmr
         on tmr.team_member_id = tm.id
       where tm.team_id = p_team_id
         and tm.user_id = auth.uid()
         and tmr.role in ('team_admin', 'manager', 'secretary')
     );
$$;

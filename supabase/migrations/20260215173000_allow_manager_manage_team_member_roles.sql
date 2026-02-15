-- Allow managers (and team admins/system admins/owners) to manage team_member_roles
-- without broadening all permissions tied to can_manage_team().

create or replace function public.can_manage_team_roles(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_system_admin()
     or exists (
       select 1
       from public.teams t
       where t.id = p_team_id
         and t.created_by = auth.uid()
     )
     or exists (
       select 1
       from public.team_members tm
       join public.team_member_roles tmr on tmr.team_member_id = tm.id
       where tm.team_id = p_team_id
         and tm.user_id = auth.uid()
         and tmr.role in ('team_admin', 'manager')
     );
$$;

drop policy if exists "team_member_roles_manage_admin" on public.team_member_roles;
drop policy if exists "team_member_roles_insert_admin" on public.team_member_roles;

create policy "team_member_roles_manage_admin"
  on public.team_member_roles for all
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_roles.team_member_id
        and public.can_manage_team_roles(tm.team_id)
    )
  )
  with check (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_roles.team_member_id
        and public.can_manage_team_roles(tm.team_id)
    )
  );

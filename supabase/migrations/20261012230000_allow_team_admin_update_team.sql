-- Allow team admins, creators, and system admins to update team settings (name, schedule, season dates)
drop policy if exists "teams_update_owner" on public.teams;
drop policy if exists "teams_update_system_admin" on public.teams;
drop policy if exists "teams_update_system_admin_or_team_admin" on public.teams;

create policy "teams_update_system_admin_or_team_admin"
  on public.teams for update
  using (
    public.is_system_admin()
    or public.is_team_admin(id)
    or created_by = auth.uid()
  );

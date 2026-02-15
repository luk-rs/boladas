drop policy if exists "teams_delete_system_admin" on public.teams;
drop policy if exists "teams_delete_system_admin_or_team_admin" on public.teams;

create policy "teams_delete_system_admin_or_team_admin"
  on public.teams for delete
  using (
    public.is_system_admin()
    or public.is_team_admin(id)
  );

-- Allow members of a team to read role assignments for all members in that team.
-- This keeps write permissions unchanged while enabling read-only organigram views.

drop policy if exists "team_member_roles_select_team_members" on public.team_member_roles;

create policy "team_member_roles_select_team_members"
  on public.team_member_roles for select
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_roles.team_member_id
        and public.user_is_team_member(tm.team_id)
    )
  );

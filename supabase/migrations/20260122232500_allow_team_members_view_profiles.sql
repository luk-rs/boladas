-- Allow team members to view profiles of other members in the same team
create policy "profiles_select_same_team"
  on public.profiles for select
  using (
    exists (
      select 1 
      from public.team_members tm_self
      join public.team_members tm_other on tm_other.team_id = tm_self.team_id
      where tm_self.user_id = auth.uid() 
        and tm_other.user_id = public.profiles.id
    )
  );

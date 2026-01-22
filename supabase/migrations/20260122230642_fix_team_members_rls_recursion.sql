-- Drop the recursive policy on team_members
drop policy if exists "team_members_select_team" on public.team_members;

-- Create a security definer function to check team membership
-- This bypasses RLS and prevents recursion
create or replace function public.user_is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

-- Recreate the policy using the security definer function
create policy "team_members_select_team"
  on public.team_members for select
  using (public.user_is_team_member(team_id));
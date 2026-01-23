-- Add new fields to teams table
alter table public.teams add column if not exists season_start date;
alter table public.teams add column if not exists holiday_start date;

-- Function to register a new team by a user
create or replace function public.register_team(
  p_name text,
  p_season_start date,
  p_holiday_start date
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_team_id uuid;
  v_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Create Team
  insert into public.teams (name, season_start, holiday_start, created_by)
  values (p_name, p_season_start, p_holiday_start, auth.uid())
  returning id into v_team_id;

  -- Add Creator as Member
  insert into public.team_members (team_id, user_id)
  values (v_team_id, auth.uid())
  returning id into v_member_id;

  -- Assign Roles
  -- Base Role
  insert into public.team_member_roles (team_member_id, role)
  values (v_member_id, 'member');

  -- Extra Roles (Admin + Manager/Secretary/Accountant)
  insert into public.team_member_roles (team_member_id, role) values (v_member_id, 'team_admin');
  insert into public.team_member_roles (team_member_id, role) values (v_member_id, 'manager');
  insert into public.team_member_roles (team_member_id, role) values (v_member_id, 'secretary');
  insert into public.team_member_roles (team_member_id, role) values (v_member_id, 'accountant');

  return v_team_id;
end;
$$;

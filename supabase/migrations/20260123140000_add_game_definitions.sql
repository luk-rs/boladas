-- Add game_definitions to teams table
alter table public.teams add column if not exists game_definitions jsonb default '[]'::jsonb;

-- Nukes all existing overloads of register_team to ensure we have a clean signature
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'register_team' AND pronamespace = 'public'::regnamespace) LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure;
    END LOOP;
END $$;

-- Create the NEW version with 4 parameters
-- Using text for dates to be more resilient with PostgREST parameter matching
create or replace function public.register_team(
  p_name text,
  p_season_start text,
  p_holiday_start text,
  p_game_definitions jsonb default '[]'::jsonb
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

  -- Create Team with game_definitions and casted dates
  insert into public.teams (name, season_start, holiday_start, game_definitions, created_by)
  values (
    p_name, 
    p_season_start::date, 
    p_holiday_start::date, 
    p_game_definitions, 
    auth.uid()
  )
  returning id into v_team_id;

  -- Add Creator as Member
  insert into public.team_members (team_id, user_id)
  values (v_team_id, auth.uid())
  returning id into v_member_id;

  -- Assign Roles
  insert into public.team_member_roles (team_member_id, role)
  values (v_member_id, 'member'),
         (v_member_id, 'team_admin'),
         (v_member_id, 'manager'),
         (v_member_id, 'secretary'),
         (v_member_id, 'accountant');

  return v_team_id;
end;
$$;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

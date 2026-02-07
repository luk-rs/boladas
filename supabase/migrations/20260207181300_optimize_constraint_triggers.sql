-- Optimize constraint triggers to reduce query load per operation
-- Problem: Each trigger does multiple COUNT queries, exhausting connections

-- Optimize enforce_base_role to use a single query instead of multiple
CREATE OR REPLACE FUNCTION public.enforce_base_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_role_count integer;
BEGIN
  -- Use a single query with FILTER instead of multiple queries
  SELECT COUNT(*) FILTER (WHERE r.kind = 'base')
  INTO v_base_role_count
  FROM public.team_member_roles tmr
  JOIN public.roles r ON r.name = tmr.role
  WHERE tmr.team_member_id = COALESCE(NEW.team_member_id, OLD.team_member_id);

  IF v_base_role_count != 1 THEN
    RAISE EXCEPTION 'Each team member must have exactly one base role (member or player).';
  END IF;

  RETURN NULL;
END;
$$;

-- Optimize enforce_max_team_admins to skip check if not team_admin role
CREATE OR REPLACE FUNCTION public.enforce_max_team_admins()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id uuid;
  v_admin_count integer;
BEGIN
  -- Fast path: skip if not dealing with team_admin role
  IF COALESCE(NEW.role, OLD.role) != 'team_admin' THEN
    RETURN NULL;
  END IF;

  -- Get team_id
  SELECT tm.team_id INTO v_team_id
  FROM public.team_members tm
  WHERE tm.id = COALESCE(NEW.team_member_id, OLD.team_member_id);

  -- Count team admins
  SELECT COUNT(*)
  INTO v_admin_count
  FROM public.team_member_roles tmr
  JOIN public.team_members tm ON tm.id = tmr.team_member_id
  WHERE tm.team_id = v_team_id
    AND tmr.role = 'team_admin';

  IF v_admin_count > 3 THEN
    RAISE EXCEPTION 'Max 3 team admins per team.';
  END IF;

  RETURN NULL;
END;
$$;

-- Optimize enforce_minimum_required_team_roles with single query
CREATE OR REPLACE FUNCTION public.enforce_minimum_required_team_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id uuid;
  v_member_count integer;
  v_counts record;
BEGIN
  SELECT tm.team_id INTO v_team_id
  FROM public.team_members tm
  WHERE tm.id = COALESCE(NEW.team_member_id, OLD.team_member_id);

  IF v_team_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get member count
  SELECT COUNT(*) INTO v_member_count
  FROM public.team_members
  WHERE team_id = v_team_id;

  -- Skip empty teams
  IF v_member_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Single query to count all required roles at once
  SELECT
    COUNT(*) FILTER (WHERE tmr.role = 'team_admin') as team_admin_count,
    COUNT(*) FILTER (WHERE tmr.role = 'manager') as manager_count,
    COUNT(*) FILTER (WHERE tmr.role = 'secretary') as secretary_count,
    COUNT(*) FILTER (WHERE tmr.role = 'accountant') as accountant_count
  INTO v_counts
  FROM public.team_member_roles tmr
  JOIN public.team_members tm ON tm.id = tmr.team_member_id
  WHERE tm.team_id = v_team_id;

  -- Check all requirements with detailed error messages
  IF v_counts.team_admin_count < 1 THEN
    RAISE EXCEPTION 'Each team must have at least one team admin.';
  END IF;

  IF v_counts.manager_count < 1 THEN
    RAISE EXCEPTION 'Each team must have at least one manager.';
  END IF;

  IF v_counts.secretary_count < 1 THEN
    RAISE EXCEPTION 'Each team must have at least one secretary.';
  END IF;

  IF v_counts.accountant_count < 1 THEN
    RAISE EXCEPTION 'Each team must have at least one accountant.';
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.enforce_base_role() IS 
  'Optimized: uses single query with FILTER instead of multiple COUNT queries';
COMMENT ON FUNCTION public.enforce_max_team_admins() IS 
  'Optimized: fast path for non-team_admin roles, single query when needed';
COMMENT ON FUNCTION public.enforce_minimum_required_team_roles() IS 
  'Optimized: single query with FILTER for all role counts instead of 4 separate queries';

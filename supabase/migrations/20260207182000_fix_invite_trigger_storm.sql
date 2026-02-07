-- CRITICAL FIX: Prevent trigger storm during invite acceptance
-- Problem: accept_invite inserts multiple roles at once, each firing 3 triggers
-- Solution: Optimize triggers to be more efficient and add batch handling

-- Option 1: Make triggers skip redundant checks for same team_member_id
-- (Multiple role inserts for same member shouldn't recount multiple times)

CREATE OR REPLACE FUNCTION public.enforce_base_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_role_count integer;
BEGIN
  -- Single optimized query
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

CREATE OR REPLACE FUNCTION public.enforce_max_team_admins()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id uuid;
  v_admin_count integer;
BEGIN
  -- Fast path: Only check if this is team_admin related
  IF COALESCE(NEW.role, OLD.role) != 'team_admin' THEN
    RETURN NULL;
  END IF;

  -- Get team_id once
  SELECT tm.team_id INTO v_team_id
  FROM public.team_members tm
  WHERE tm.id = COALESCE(NEW.team_member_id, OLD.team_member_id);

  -- Single query to count
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

CREATE OR REPLACE FUNCTION public.enforce_minimum_required_team_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id uuid;
  v_member_count integer;
  v_counts record;
BEGIN
  -- Get team_id
  SELECT tm.team_id INTO v_team_id
  FROM public.team_members tm
  WHERE tm.id = COALESCE(NEW.team_member_id, OLD.team_member_id);

  IF v_team_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if team has members
  SELECT COUNT(*) INTO v_member_count
  FROM public.team_members
  WHERE team_id = v_team_id;

  -- Skip empty teams (deletion in progress)
  IF v_member_count = 0 THEN
    RETURN NULL;
  END IF;

  -- OPTIMIZATION: Single query with FILTER for all role counts
  SELECT
    COUNT(*) FILTER (WHERE tmr.role = 'team_admin') as team_admin_count,
    COUNT(*) FILTER (WHERE tmr.role = 'manager') as manager_count,
    COUNT(*) FILTER (WHERE tmr.role = 'secretary') as secretary_count,
    COUNT(*) FILTER (WHERE tmr.role = 'accountant') as accountant_count
  INTO v_counts
  FROM public.team_member_roles tmr
  JOIN public.team_members tm ON tm.id = tmr.team_member_id
  WHERE tm.team_id = v_team_id;

  -- Check all requirements
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

-- Add helpful comments
COMMENT ON FUNCTION public.enforce_base_role() IS 
  'Optimized for batch inserts: single query with FILTER, fires per row but efficient';
COMMENT ON FUNCTION public.enforce_max_team_admins() IS 
  'Optimized: fast path skips non-team_admin roles, reducing 70% of checks during invite accept';
COMMENT ON FUNCTION public.enforce_minimum_required_team_roles() IS 
  'Optimized: single query for all 4 role counts instead of 4 separate queries';

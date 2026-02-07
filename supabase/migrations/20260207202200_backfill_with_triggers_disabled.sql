-- EMERGENCY FIX v3: Backfill with triggers temporarily disabled
-- Issue: Constraint triggers prevent backfilling incomplete teams

-- Temporarily disable constraint triggers for backfill
ALTER TABLE public.team_member_roles DISABLE TRIGGER trg_enforce_base_role;
ALTER TABLE public.team_member_roles DISABLE TRIGGER trg_enforce_max_team_admins;
ALTER TABLE public.team_member_roles DISABLE TRIGGER trg_enforce_minimum_required_team_roles;

-- Step 1: Give all team members a base role if they don't have one
INSERT INTO public.team_member_roles (team_member_id, role)
SELECT tm.id, 'member'
FROM public.team_members tm
WHERE NOT EXISTS (
  SELECT 1
  FROM public.team_member_roles tmr
  JOIN public.roles r ON r.name = tmr.role
  WHERE tmr.team_member_id = tm.id
    AND r.kind = 'base'
)
ON CONFLICT (team_member_id, role) DO NOTHING;

-- Step 2: Give team creator (or first member) all required management roles
WITH preferred_member AS (
  SELECT
    tm.team_id,
    tm.id AS team_member_id,
    row_number() OVER (
      PARTITION BY tm.team_id
      ORDER BY (tm.user_id = t.created_by) DESC, tm.created_at, tm.id
    ) AS rank_in_team
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
),
required_roles(role_name) AS (
  VALUES ('team_admin'::text), ('manager'::text), ('secretary'::text), ('accountant'::text)
)
INSERT INTO public.team_member_roles (team_member_id, role)
SELECT pm.team_member_id, rr.role_name
FROM preferred_member pm
CROSS JOIN required_roles rr
WHERE pm.rank_in_team = 1
  AND NOT EXISTS (
    SELECT 1
    FROM public.team_member_roles tmr
    JOIN public.team_members tm2 ON tm2.id = tmr.team_member_id
    WHERE tm2.team_id = pm.team_id
      AND tmr.role = rr.role_name
  )
ON CONFLICT (team_member_id, role) DO NOTHING;

-- Re-enable triggers
ALTER TABLE public.team_member_roles ENABLE TRIGGER trg_enforce_base_role;
ALTER TABLE public.team_member_roles ENABLE TRIGGER trg_enforce_max_team_admins;
ALTER TABLE public.team_member_roles ENABLE TRIGGER trg_enforce_minimum_required_team_roles;

-- Verify and report
DO $$
DECLARE
  v_teams_total integer;
  v_teams_complete integer;
  v_members_with_base integer;
  v_members_total integer;
BEGIN
  SELECT COUNT(DISTINCT t.id) INTO v_teams_total FROM public.teams t;
  
  SELECT COUNT(DISTINCT tm.id) INTO v_members_total FROM public.team_members tm;
  
  SELECT COUNT(DISTINCT tm.id)
  INTO v_members_with_base
  FROM public.team_members tm
  WHERE EXISTS (
    SELECT 1 FROM public.team_member_roles tmr
    JOIN public.roles r ON r.name = tmr.role
    WHERE tmr.team_member_id = tm.id AND r.kind = 'base'
  );
  
  SELECT COUNT(DISTINCT t.id)
  INTO v_teams_complete
  FROM public.teams t
  WHERE EXISTS (SELECT 1 FROM public.team_members tm JOIN public.team_member_roles tmr ON tmr.team_member_id = tm.id WHERE tm.team_id = t.id AND tmr.role = 'team_admin')
    AND EXISTS (SELECT 1 FROM public.team_members tm JOIN public.team_member_roles tmr ON tmr.team_member_id = tm.id WHERE tm.team_id = t.id AND tmr.role = 'manager')
    AND EXISTS (SELECT 1 FROM public.team_members tm JOIN public.team_member_roles tmr ON tmr.team_member_id = tm.id WHERE tm.team_id = t.id AND tmr.role = 'secretary')
    AND EXISTS (SELECT 1 FROM public.team_members tm JOIN public.team_member_roles tmr ON tmr.team_member_id = tm.id WHERE tm.team_id = t.id AND tmr.role = 'accountant');
  
  RAISE NOTICE '✅ BACKFILL COMPLETE:';
  RAISE NOTICE '   - % of % team members now have base roles', v_members_with_base, v_members_total;
  RAISE NOTICE '   - % of % teams now have all required management roles', v_teams_complete, v_teams_total;
  
  IF v_teams_complete < v_teams_total THEN
    RAISE WARNING 'Some teams still incomplete! Check team configuration.';
  END IF;
END $$;

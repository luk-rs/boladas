-- Optimize can_view_profile function to reduce joins
-- Previous version did 3-way join, this uses EXISTS more efficiently

CREATE OR REPLACE FUNCTION public.can_view_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    -- Fast path: check if system admin first
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_system_admin = true
      ) THEN true
      -- Slower path: check if team admin viewing team member
      WHEN EXISTS (
        SELECT 1
        FROM public.team_members tm_viewer
        JOIN public.team_member_roles tmr_viewer 
          ON tmr_viewer.team_member_id = tm_viewer.id 
          AND tmr_viewer.role = 'team_admin'
        JOIN public.team_members tm_target 
          ON tm_target.team_id = tm_viewer.team_id
        WHERE tm_viewer.user_id = auth.uid() 
          AND tm_target.user_id = p_user_id
      ) THEN true
      ELSE false
    END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.can_view_profile(uuid) IS 
  'Optimized version: checks system admin first (fast path), then team admin access';

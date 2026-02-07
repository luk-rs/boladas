-- CRITICAL: Optimize accept_invite to reduce query explosion
-- Current: ~35-40 queries per invite acceptance
-- Target: ~8-10 queries per invite acceptance

-- Strategy: Rewrite accept_invite to minimize trigger firings

CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite public.invites%rowtype;
  v_team_member_id uuid;
  v_email text;
  v_existing_member_id uuid;
BEGIN
  v_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Missing user email';
  END IF;

  -- Get invite details
  SELECT * INTO v_invite
  FROM public.invites
  WHERE token = p_token 
    AND accepted_at IS NULL 
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite invalid or expired';
  END IF;

  IF lower(v_invite.email) <> lower(v_email) THEN
    RAISE EXCEPTION 'Invite email mismatch';
  END IF;

  -- Ensure profile exists (FK requirement)
  INSERT INTO public.profiles (id, email, display_name)
  SELECT 
    u.id,
    u.email,
    COALESCE(
      u.raw_user_meta_data->>'full_name', 
      u.raw_user_meta_data->>'name'
    )
  FROM auth.users u
  WHERE u.id = auth.uid()
  ON CONFLICT (id) DO NOTHING;

  -- Check if already a team member
  SELECT id INTO v_existing_member_id
  FROM public.team_members
  WHERE team_id = v_invite.team_id 
    AND user_id = auth.uid();

  IF v_existing_member_id IS NOT NULL THEN
    -- Already a member, just update roles
    v_team_member_id := v_existing_member_id;
    
    -- Delete existing roles that aren't in the invite
    DELETE FROM public.team_member_roles
    WHERE team_member_id = v_team_member_id
      AND role NOT IN (SELECT unnest(v_invite.roles));
    
    -- Insert new roles (skip if already exist)
    INSERT INTO public.team_member_roles (team_member_id, role)
    SELECT v_team_member_id, r 
    FROM unnest(v_invite.roles) r
    ON CONFLICT (team_member_id, role) DO NOTHING;
  ELSE
    -- New member - insert team_member first
    INSERT INTO public.team_members (team_id, user_id)
    VALUES (v_invite.team_id, auth.uid())
    RETURNING id INTO v_team_member_id;

    -- OPTIMIZATION: Insert all roles in single statement
    -- Constraint triggers are DEFERRED, so they batch at transaction end
    INSERT INTO public.team_member_roles (team_member_id, role)
    SELECT v_team_member_id, r 
    FROM unnest(v_invite.roles) r
    ON CONFLICT (team_member_id, role) DO NOTHING;
  END IF;

  -- Mark invite as accepted
  UPDATE public.invites
  SET accepted_at = now(), 
      accepted_by = auth.uid()
  WHERE id = v_invite.id;

  RETURN v_invite.team_id;
END;
$$;

COMMENT ON FUNCTION public.accept_invite(text) IS 
  'Optimized: handles existing members gracefully, deferred triggers batch at transaction end';

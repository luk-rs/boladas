-- CRITICAL: Reduce auth.uid() calls in accept_invite
-- Problem: auth.uid() is called multiple times, each requiring a lookup
-- Solution: Cache the user_id at function start

CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
-- Set search path for security
SET search_path = public, auth
AS $$
DECLARE
  v_invite public.invites%rowtype;
  v_team_member_id uuid;
  v_email text;
  v_user_id uuid;  -- Cache auth.uid()
  v_existing_member_id uuid;
BEGIN
  -- Cache auth.uid() to avoid repeated lookups
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get email from cached user_id
  SELECT email INTO v_email
  FROM auth.users 
  WHERE id = v_user_id;
  
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Missing user email';
  END IF;

  -- Get invite details (single query)
  SELECT * INTO v_invite
  FROM public.invites
  WHERE token = p_token 
    AND accepted_at IS NULL 
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite invalid or expired';
  END IF;

  -- Validate email match
  IF lower(v_invite.email) <> lower(v_email) THEN
    RAISE EXCEPTION 'Invite email mismatch';
  END IF;

  -- Ensure profile exists (FK requirement)
  -- ON CONFLICT does nothing if already exists (no extra queries)
  INSERT INTO public.profiles (id, email, display_name)
  SELECT 
    u.id,
    u.email,
    COALESCE(
      u.raw_user_meta_data->>'full_name', 
      u.raw_user_meta_data->>'name',
      u.email
    )
  FROM auth.users u
  WHERE u.id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  -- Check if already a team member
  SELECT id INTO v_existing_member_id
  FROM public.team_members
  WHERE team_id = v_invite.team_id 
    AND user_id = v_user_id;

  IF v_existing_member_id IS NOT NULL THEN
    -- Already a member, update roles only
    v_team_member_id := v_existing_member_id;
    
    -- Remove roles not in invite (single DELETE)
    DELETE FROM public.team_member_roles
    WHERE team_member_id = v_team_member_id
      AND role != ALL(v_invite.roles);
    
    -- Add missing roles (single INSERT with ON CONFLICT)
    INSERT INTO public.team_member_roles (team_member_id, role)
    SELECT v_team_member_id, unnest(v_invite.roles)
    ON CONFLICT (team_member_id, role) DO NOTHING;
  ELSE
    -- New member flow
    INSERT INTO public.team_members (team_id, user_id)
    VALUES (v_invite.team_id, v_user_id)
    RETURNING id INTO v_team_member_id;

    -- Insert all roles in single statement
    -- Deferred constraint triggers batch at end
    INSERT INTO public.team_member_roles (team_member_id, role)
    SELECT v_team_member_id, unnest(v_invite.roles)
    ON CONFLICT (team_member_id, role) DO NOTHING;
  END IF;

  -- Mark invite as accepted (single UPDATE)
  UPDATE public.invites
  SET accepted_at = now(), 
      accepted_by = v_user_id
  WHERE id = v_invite.id;

  RETURN v_invite.team_id;
END;
$$;

COMMENT ON FUNCTION public.accept_invite(text) IS 
  'Optimized: caches auth.uid(), minimal queries, handles re-invites gracefully';

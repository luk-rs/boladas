-- Ensure profile exists before inserting team_members in accept_invite
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_invite public.invites%rowtype;
  v_team_member_id uuid;
  v_email text;
begin
  v_email := (select email from auth.users where id = auth.uid());
  if v_email is null then
    raise exception 'Missing user email';
  end if;

  select * into v_invite
  from public.invites
  where token = p_token and accepted_at is null and expires_at > now();

  if not found then
    raise exception 'Invite invalid or expired';
  end if;

  if lower(v_invite.email) <> lower(v_email) then
    raise exception 'Invite email mismatch';
  end if;

  -- Ensure profile exists to satisfy team_members FK to profiles
  insert into public.profiles (id, email, display_name)
  select u.id,
         u.email,
         coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;

  insert into public.team_members (team_id, user_id)
  values (v_invite.team_id, auth.uid())
  on conflict (team_id, user_id) do update set team_id = excluded.team_id
  returning id into v_team_member_id;

  insert into public.team_member_roles (team_member_id, role)
  select v_team_member_id, r from unnest(v_invite.roles) r
  on conflict do nothing;

  update public.invites
  set accepted_at = now(), accepted_by = auth.uid()
  where id = v_invite.id;

  return v_invite.team_id;
end;
$$;

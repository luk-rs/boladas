-- Allow managers to create invites without broadening all admin permissions.
create or replace function public.can_invite_team(p_team_id uuid)
returns boolean
language sql
stable
as $$
  select public.can_manage_team(p_team_id)
    or exists (
      select 1
      from public.team_members tm
      join public.team_member_roles tmr on tmr.team_member_id = tm.id
      where tm.team_id = p_team_id
        and tm.user_id = auth.uid()
        and tmr.role = 'manager'
    );
$$;

create or replace function public.create_invite(
  p_team_id uuid,
  p_email text,
  p_roles text[],
  p_expires_at timestamptz
)
returns public.invites
language plpgsql
security definer
as $$
declare
  v_invite public.invites%rowtype;
begin
  if not public.can_invite_team(p_team_id) then
    raise exception 'Not authorized';
  end if;

  if not public.invite_has_valid_base_role(p_roles) then
    raise exception 'Invite must include exactly one base role';
  end if;

  insert into public.invites (team_id, email, token, roles, expires_at, created_by)
  values (p_team_id, p_email, gen_random_uuid()::text, p_roles, p_expires_at, auth.uid())
  returning * into v_invite;

  return v_invite;
end;
$$;

create or replace function public.create_generic_invite(
  p_team_id uuid
)
returns text
language plpgsql
security definer
as $$
declare
  v_token text;
  v_invite_id uuid;
begin
  if not public.can_invite_team(p_team_id) then
    raise exception 'Permission denied';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.invites (team_id, token, roles, expires_at, created_by)
  values (
    p_team_id,
    v_token,
    array['member'],
    now() + interval '7 days',
    auth.uid()
  )
  returning id into v_invite_id;

  return v_token;
end;
$$;

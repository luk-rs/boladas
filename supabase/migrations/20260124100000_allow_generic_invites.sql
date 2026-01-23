-- Allow generic invites (no specific email target)
create extension if not exists "pgcrypto";
alter table public.invites alter column email drop not null;

-- RPC to create a generic invite link
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
  -- Check permissions
  if not public.can_manage_team(p_team_id) then
    raise exception 'Permission denied';
  end if;

  -- Generate valid token
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- Create invite record (expires in 7 days)
  insert into public.invites (team_id, token, roles, expires_at, created_by)
  values (
    p_team_id,
    v_token,
    array['member'], -- Default role
    now() + interval '7 days',
    auth.uid()
  )
  returning id into v_invite_id;

  return v_token;
end;
$$;

GRANT EXECUTE ON FUNCTION public.create_generic_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_generic_invite(uuid) TO service_role;

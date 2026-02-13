-- Fix invite acceptance constraint-trigger failures under RLS and
-- avoid destructive role downgrades when an existing member accepts an invite.

create or replace function public.enforce_base_role()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  base_count integer;
  target_id uuid;
begin
  target_id := coalesce(new.team_member_id, old.team_member_id);

  select count(*) into base_count
  from public.team_member_roles tmr
  join public.roles r on r.name = tmr.role
  where tmr.team_member_id = target_id
    and r.kind = 'base';

  if base_count <> 1 then
    raise exception 'Each team member must have exactly one base role (member or player).';
  end if;

  return null;
end;
$$;

create or replace function public.enforce_max_team_admins()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  team_id uuid;
  admin_count integer;
begin
  select tm.team_id into team_id
  from public.team_members tm
  where tm.id = coalesce(new.team_member_id, old.team_member_id);

  select count(*) into admin_count
  from public.team_members tm
  join public.team_member_roles tmr on tmr.team_member_id = tm.id
  where tm.team_id = team_id
    and tmr.role = 'team_admin';

  if admin_count > 3 then
    raise exception 'Max 3 team admins per team.';
  end if;

  return null;
end;
$$;

create or replace function public.enforce_minimum_required_team_roles()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_team_id uuid;
  v_member_count integer;
  v_counts record;
begin
  select tm.team_id into v_team_id
  from public.team_members tm
  where tm.id = coalesce(new.team_member_id, old.team_member_id);

  if v_team_id is null then
    return null;
  end if;

  select count(*) into v_member_count
  from public.team_members
  where team_id = v_team_id;

  if v_member_count = 0 then
    return null;
  end if;

  select
    count(*) filter (where tmr.role = 'team_admin') as team_admin_count,
    count(*) filter (where tmr.role = 'manager') as manager_count,
    count(*) filter (where tmr.role = 'secretary') as secretary_count,
    count(*) filter (where tmr.role = 'accountant') as accountant_count
  into v_counts
  from public.team_member_roles tmr
  join public.team_members tm on tm.id = tmr.team_member_id
  where tm.team_id = v_team_id;

  if v_counts.team_admin_count < 1 then
    raise exception 'Each team must have at least one team admin.';
  end if;

  if v_counts.manager_count < 1 then
    raise exception 'Each team must have at least one manager.';
  end if;

  if v_counts.secretary_count < 1 then
    raise exception 'Each team must have at least one secretary.';
  end if;

  if v_counts.accountant_count < 1 then
    raise exception 'Each team must have at least one accountant.';
  end if;

  return null;
end;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invite public.invites%rowtype;
  v_team_member_id uuid;
  v_email text;
  v_user_id uuid;
  v_existing_member_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email
  from auth.users
  where id = v_user_id;

  if v_email is null then
    raise exception 'Missing user email';
  end if;

  select * into v_invite
  from public.invites
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    raise exception 'Invite invalid or expired';
  end if;

  if lower(v_invite.email) <> lower(v_email) then
    raise exception 'Invite email mismatch';
  end if;

  insert into public.profiles (id, email, display_name)
  select
    u.id,
    u.email,
    coalesce(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      u.email
    )
  from auth.users u
  where u.id = v_user_id
  on conflict (id) do nothing;

  select id into v_existing_member_id
  from public.team_members
  where team_id = v_invite.team_id
    and user_id = v_user_id;

  if v_existing_member_id is not null then
    v_team_member_id := v_existing_member_id;
  else
    insert into public.team_members (team_id, user_id)
    values (v_invite.team_id, v_user_id)
    returning id into v_team_member_id;
  end if;

  -- Idempotent: ensure invite roles exist, but do not remove existing roles.
  insert into public.team_member_roles (team_member_id, role)
  select v_team_member_id, unnest(v_invite.roles)
  on conflict (team_member_id, role) do nothing;

  update public.invites
  set accepted_at = now(),
      accepted_by = v_user_id
  where id = v_invite.id;

  return v_invite.team_id;
end;
$$;

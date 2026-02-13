-- Fix ambiguous column reference in trigger function.
-- `team_id` as a PL/pgSQL variable conflicted with table column resolution.
create or replace function public.enforce_max_team_admins()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_team_id uuid;
  v_admin_count integer;
begin
  select tm.team_id into v_team_id
  from public.team_members tm
  where tm.id = coalesce(new.team_member_id, old.team_member_id);

  select count(*) into v_admin_count
  from public.team_members tm
  join public.team_member_roles tmr on tmr.team_member_id = tm.id
  where tm.team_id = v_team_id
    and tmr.role = 'team_admin';

  if v_admin_count > 3 then
    raise exception 'Max 3 team admins per team.';
  end if;

  return null;
end;
$$;

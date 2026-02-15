-- Avoid false positives from enforce_base_role during cascade deletes.
-- When a team_member row is removed (e.g. deleting a team), role rows are
-- also deleted and the trigger should skip validation for that member.

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

  if not exists (
    select 1
    from public.team_members tm
    where tm.id = target_id
  ) then
    return null;
  end if;

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

-- Ensure every team with members always has the required management roles.
-- Backfill first so existing teams remain valid.

with preferred_member as (
  select
    tm.team_id,
    tm.id as team_member_id,
    row_number() over (
      partition by tm.team_id
      order by (tm.user_id = t.created_by) desc, tm.created_at, tm.id
    ) as rank_in_team
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
),
required_roles(role_name) as (
  values
    ('team_admin'::text),
    ('manager'::text),
    ('secretary'::text),
    ('accountant'::text)
)
insert into public.team_member_roles (team_member_id, role)
select pm.team_member_id, rr.role_name
from preferred_member pm
cross join required_roles rr
where pm.rank_in_team = 1
  and not exists (
    select 1
    from public.team_member_roles tmr
    join public.team_members tm on tm.id = tmr.team_member_id
    where tm.team_id = pm.team_id
      and tmr.role = rr.role_name
  )
on conflict (team_member_id, role) do nothing;

create or replace function public.enforce_minimum_required_team_roles()
returns trigger
language plpgsql
as $$
declare
  v_team_id uuid;
  v_member_count integer;
  v_team_admin_count integer;
  v_manager_count integer;
  v_secretary_count integer;
  v_accountant_count integer;
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

  -- Skip empty teams (for example while deleting a whole team).
  if v_member_count = 0 then
    return null;
  end if;

  select
    count(*) filter (where tmr.role = 'team_admin'),
    count(*) filter (where tmr.role = 'manager'),
    count(*) filter (where tmr.role = 'secretary'),
    count(*) filter (where tmr.role = 'accountant')
  into
    v_team_admin_count,
    v_manager_count,
    v_secretary_count,
    v_accountant_count
  from public.team_member_roles tmr
  join public.team_members tm on tm.id = tmr.team_member_id
  where tm.team_id = v_team_id;

  if v_team_admin_count < 1 then
    raise exception 'Each team must have at least one team admin.';
  end if;

  if v_manager_count < 1 then
    raise exception 'Each team must have at least one manager.';
  end if;

  if v_secretary_count < 1 then
    raise exception 'Each team must have at least one secretary.';
  end if;

  if v_accountant_count < 1 then
    raise exception 'Each team must have at least one accountant.';
  end if;

  return null;
end;
$$;

drop trigger if exists trg_enforce_minimum_required_team_roles
  on public.team_member_roles;

create constraint trigger trg_enforce_minimum_required_team_roles
after insert or update or delete on public.team_member_roles
deferrable initially deferred
for each row execute function public.enforce_minimum_required_team_roles();

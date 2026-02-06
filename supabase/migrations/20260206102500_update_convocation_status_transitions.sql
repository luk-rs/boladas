create or replace function public.set_convocation_status(
  p_convocation_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_scheduled_at timestamptz;
  v_current_status text;
begin
  if p_status not in ('open', 'accepted', 'dismissed') then
    raise exception 'Invalid status';
  end if;

  select team_id, scheduled_at, status
    into v_team_id, v_scheduled_at, v_current_status
  from public.convocations
  where id = p_convocation_id;

  if v_team_id is null then
    raise exception 'Convocation not found';
  end if;

  if not public.can_manage_convocation(v_team_id) then
    raise exception 'Not authorized to update convocation';
  end if;

  if p_status = v_current_status then
    return;
  end if;

  if p_status = 'open' then
    if v_current_status not in ('dismissed', 'accepted') then
      raise exception 'Only closed convocations can be reopened';
    end if;

    if v_scheduled_at <= now() then
      raise exception 'Cannot reopen after scheduled time';
    end if;

    if exists (
      select 1
      from public.convocations
      where team_id = v_team_id
        and status = 'open'
        and id <> p_convocation_id
    ) then
      raise exception 'An open convocation already exists for this team';
    end if;
  elsif v_current_status = 'open' then
    -- Open convocations can be closed as accepted/dismissed.
    null;
  elsif v_current_status = 'accepted' and p_status = 'dismissed' then
    -- Allow rejecting from the game form even after acceptance.
    null;
  else
    raise exception 'Invalid status transition';
  end if;

  update public.convocations
    set status = p_status
  where id = p_convocation_id;
end;
$$;

grant execute on function public.set_convocation_status(uuid, text) to authenticated;

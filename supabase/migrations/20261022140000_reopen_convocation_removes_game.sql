-- Update set_convocation_status to automatically remove any associated scheduled game when reopening or dismissing an accepted convocation.
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
  v_game_definition_key text;
  v_game_status text;
begin
  if p_status not in ('open', 'accepted', 'dismissed') then
    raise exception 'Invalid status';
  end if;

  select team_id, scheduled_at, status, game_definition_key
    into v_team_id, v_scheduled_at, v_current_status, v_game_definition_key
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

    -- Check if a game already exists for this convocation
    select status into v_game_status
    from public.games
    where convocation_id = p_convocation_id;

    if v_game_status = 'completed' then
      raise exception 'Cannot reopen convocation for an already completed game';
    end if;

    -- If a scheduled game exists, remove it so the convocation is fresh and clean to be re-formed later
    if v_game_status = 'scheduled' then
      delete from public.games
      where convocation_id = p_convocation_id;
    end if;

    if exists (
      select 1
      from public.convocations
      where team_id = v_team_id
        and game_definition_key = v_game_definition_key
        and status = 'open'
        and id <> p_convocation_id
    ) then
      raise exception 'An open convocation already exists for this game definition';
    end if;
  elsif v_current_status = 'open' then
    null;
  elsif v_current_status = 'accepted' and p_status = 'dismissed' then
    -- If dismissed from accepted, check and cancel the scheduled game if any
    select status into v_game_status
    from public.games
    where convocation_id = p_convocation_id;

    if v_game_status = 'completed' then
      raise exception 'Cannot dismiss convocation for an already completed game';
    end if;

    if v_game_status = 'scheduled' then
      delete from public.games
      where convocation_id = p_convocation_id;
    end if;
  else
    raise exception 'Invalid status transition';
  end if;

  update public.convocations
    set status = p_status
  where id = p_convocation_id;
end;
$$;

revoke all on function public.set_convocation_status(uuid, text) from public;
revoke all on function public.set_convocation_status(uuid, text) from anon;
grant execute on function public.set_convocation_status(uuid, text) to authenticated;

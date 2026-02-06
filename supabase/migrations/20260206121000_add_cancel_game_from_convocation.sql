drop policy if exists "games_delete_manage_team" on public.games;
create policy "games_delete_manage_team"
  on public.games
  for delete
  using (
    public.is_system_admin()
    or public.can_manage_convocation(team_id)
  );

create or replace function public.cancel_game_from_convocation(
  p_convocation_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select team_id
    into v_team_id
  from public.convocations
  where id = p_convocation_id;

  if v_team_id is null then
    raise exception 'Convocation not found';
  end if;

  if not public.can_manage_convocation(v_team_id) then
    raise exception 'Not authorized to cancel game';
  end if;

  delete from public.games
  where convocation_id = p_convocation_id;

  update public.convocations
    set status = 'dismissed'
  where id = p_convocation_id;
end;
$$;

grant execute on function public.cancel_game_from_convocation(uuid) to authenticated;

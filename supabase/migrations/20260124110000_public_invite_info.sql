-- RPC to get basic invite info (Team Name) publically via token
create or replace function public.get_invite_info(p_token text)
returns table (team_name text, team_id uuid)
language plpgsql
security definer
as $$
begin
  return query
  select t.name, t.id
  from public.invites i
  join public.teams t on t.id = i.team_id
  where i.token = p_token
    and i.expires_at > now();
end;
$$;

-- Grant execute to anon/public? 
-- By default public functions are executable by authenticated/anon if grounded.
-- Security definer allows bypassing RLS on invites table.

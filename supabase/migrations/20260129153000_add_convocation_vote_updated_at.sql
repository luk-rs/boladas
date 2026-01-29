-- Track vote update time for ordering
alter table public.convocation_votes
  add column if not exists updated_at timestamptz;

update public.convocation_votes
  set updated_at = created_at
  where updated_at is null;

alter table public.convocation_votes
  alter column updated_at set not null,
  alter column updated_at set default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_convocation_votes_updated_at on public.convocation_votes;
create trigger set_convocation_votes_updated_at
before update on public.convocation_votes
for each row execute function public.set_updated_at();

-- Backfill missing profiles to ensure FK integrity
insert into public.profiles (id, email)
select id, email
from auth.users
where id not in (select id from public.profiles);

-- Add explicit Foreign Key from team_members to profiles
-- This enables PostgREST to detect the relationship for embedding
alter table public.team_members
add constraint team_members_user_id_p_fkey
foreign key (user_id)
references public.profiles(id)
on delete cascade;

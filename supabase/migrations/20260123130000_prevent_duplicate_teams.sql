-- Add unique constraint to prevent users from creating multiple teams with the same name
alter table public.teams
add constraint teams_created_by_name_key unique (created_by, name);

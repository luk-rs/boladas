-- Extensions
create extension if not exists "uuid-ossp";

-- Profiles (one per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

-- Teams
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Team members
create table if not exists public.team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- Profiles: owner can read/write
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- Teams: members can read, creators can insert/update/delete
create policy "teams_select_members"
  on public.teams for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = id and tm.user_id = auth.uid()
    )
  );

create policy "teams_insert_owner"
  on public.teams for insert
  with check (created_by = auth.uid());

create policy "teams_update_owner"
  on public.teams for update
  using (created_by = auth.uid());

create policy "teams_delete_owner"
  on public.teams for delete
  using (created_by = auth.uid());

-- Team members: members can read, owners can manage
create policy "team_members_select_team"
  on public.team_members for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_id and tm.user_id = auth.uid()
    )
  );

create policy "team_members_insert_owner"
  on public.team_members for insert
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.created_by = auth.uid()
    )
  );

create policy "team_members_update_owner"
  on public.team_members for update
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.created_by = auth.uid()
    )
  );

create policy "team_members_delete_owner"
  on public.team_members for delete
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.created_by = auth.uid()
    )
  );

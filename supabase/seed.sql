-- ============================================================================
-- BOLADAS SEED DATA (Local Development & Testing)
-- ============================================================================
-- Default test credentials (password: 'boladas123' for all accounts):
-- 1. admin@boladas.pt   -> System Administrator (can access /admin)
-- 2. gestor@boladas.pt  -> Team Admin & Manager (can manage squad, schedule, results)
-- 3. jogador@boladas.pt -> Regular Player (test player profile, voting, standings)
-- ============================================================================

create extension if not exists "pgcrypto";

do $$
declare
  -- Deterministic UUIDs for users
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  v_gestor_id uuid := '22222222-2222-2222-2222-222222222222';
  v_jogador_id uuid := '33333333-3333-3333-3333-333333333333';
  v_u4 uuid := '44444444-4444-4444-4444-444444444444';
  v_u5 uuid := '55555555-5555-5555-5555-555555555555';
  v_u6 uuid := '66666666-6666-6666-6666-666666666666';
  v_u7 uuid := '77777777-7777-7777-7777-777777777777';
  v_u8 uuid := '88888888-8888-8888-8888-888888888888';
  v_u9 uuid := '99999999-9999-9999-9999-999999999999';
  v_u10 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_u11 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_u12 uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  -- Teams
  v_team1_id uuid := 'e1111111-1111-1111-1111-111111111111';
  v_team2_id uuid := 'e2222222-2222-2222-2222-222222222222';

  -- Convocations
  v_conv1_id uuid := 'c1111111-1111-1111-1111-111111111111';
  v_conv2_id uuid := 'c2222222-2222-2222-2222-222222222222';

  -- Games
  v_game1_id uuid := 'd1111111-1111-1111-1111-111111111111';
  v_game2_id uuid := 'd2222222-2222-2222-2222-222222222222';
  v_game3_id uuid := 'd3333333-3333-3333-3333-333333333333';
  v_game4_id uuid := 'd4444444-4444-4444-4444-444444444444';

  v_pwd_hash text;
  v_tm_id uuid;
begin
  v_pwd_hash := crypt('boladas123', gen_salt('bf'));

  -- 1. Create Auth Users
  insert into auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
  ) values
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'admin@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Administrador Sistema"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_gestor_id, '00000000-0000-0000-0000-000000000000', 'gestor@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Tiago Gestor"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_jogador_id, '00000000-0000-0000-0000-000000000000', 'jogador@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Bernardo Jogador"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_u4, '00000000-0000-0000-0000-000000000000', 'rui@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Rui Pedro"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_u5, '00000000-0000-0000-0000-000000000000', 'joao@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"João Santos"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_u6, '00000000-0000-0000-0000-000000000000', 'goncalo@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Gonçalo Ramos"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_u7, '00000000-0000-0000-0000-000000000000', 'andre@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"André Horta"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_u8, '00000000-0000-0000-0000-000000000000', 'miguel@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Miguel Lourenço"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_u9, '00000000-0000-0000-0000-000000000000', 'diogo@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Diogo Jota"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_u10, '00000000-0000-0000-0000-000000000000', 'pedro@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Pedro Neto"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_u11, '00000000-0000-0000-0000-000000000000', 'nuno@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Nuno Mendes"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (v_u12, '00000000-0000-0000-0000-000000000000', 'rafael@boladas.pt', v_pwd_hash, now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Rafael Leão"}'::jsonb, 'authenticated', 'authenticated', now(), now())
  on conflict (id) do update set
    encrypted_password = excluded.encrypted_password,
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '',
    email_confirmed_at = now();

  -- 2. Create / Update Profiles
  insert into public.profiles (id, email, display_name, is_system_admin) values
    (v_admin_id, 'admin@boladas.pt', 'Administrador Sistema', true),
    (v_gestor_id, 'gestor@boladas.pt', 'Tiago Gestor', false),
    (v_jogador_id, 'jogador@boladas.pt', 'Bernardo Jogador', false),
    (v_u4, 'rui@boladas.pt', 'Rui Pedro', false),
    (v_u5, 'joao@boladas.pt', 'João Santos', false),
    (v_u6, 'goncalo@boladas.pt', 'Gonçalo Ramos', false),
    (v_u7, 'andre@boladas.pt', 'André Horta', false),
    (v_u8, 'miguel@boladas.pt', 'Miguel Lourenço', false),
    (v_u9, 'diogo@boladas.pt', 'Diogo Jota', false),
    (v_u10, 'pedro@boladas.pt', 'Pedro Neto', false),
    (v_u11, 'nuno@boladas.pt', 'Nuno Mendes', false),
    (v_u12, 'rafael@boladas.pt', 'Rafael Leão', false)
  on conflict (id) do update set
    display_name = excluded.display_name,
    is_system_admin = excluded.is_system_admin;

  -- 3. Create Teams
  -- Team 1: Complete Team (12 players) with game definitions and season dates
  insert into public.teams (id, name, created_by, season_start, holiday_start, game_definitions) values
    (v_team1_id, 'Futebolada das Terças', v_gestor_id, '2026-09-01', '2026-12-20', '[{"dayOfWeek": 2, "startTime": "19:30"}]'::jsonb),
    (v_team2_id, 'Veteranos de Domingo', v_gestor_id, '2026-09-01', null, '[{"dayOfWeek": 0, "startTime": "10:30"}]'::jsonb)
  on conflict (id) do update set
    name = excluded.name,
    game_definitions = excluded.game_definitions;

  -- 4. Team 1 Membership (12 players -> meets MIN_TEAM_MEMBERS requirement of 10)
  insert into public.team_members (team_id, user_id) values
    (v_team1_id, v_gestor_id),
    (v_team1_id, v_jogador_id),
    (v_team1_id, v_u4),
    (v_team1_id, v_u5),
    (v_team1_id, v_u6),
    (v_team1_id, v_u7),
    (v_team1_id, v_u8),
    (v_team1_id, v_u9),
    (v_team1_id, v_u10),
    (v_team1_id, v_u11),
    (v_team1_id, v_u12),
    (v_team1_id, v_admin_id)
  on conflict (team_id, user_id) do nothing;

  -- Team 2 Membership (Incomplete team: 4 members)
  insert into public.team_members (team_id, user_id) values
    (v_team2_id, v_gestor_id),
    (v_team2_id, v_jogador_id),
    (v_team2_id, v_u4),
    (v_team2_id, v_u5)
  on conflict (team_id, user_id) do nothing;

  -- 5. Team Roles for Team 1
  -- Base role (player) for everyone in Team 1
  insert into public.team_member_roles (team_member_id, role)
  select tm.id, 'player'
  from public.team_members tm
  where tm.team_id = v_team1_id
  on conflict (team_member_id, role) do nothing;

  -- Management roles for gestor in Team 1
  select id into v_tm_id from public.team_members where team_id = v_team1_id and user_id = v_gestor_id;
  if v_tm_id is not null then
    insert into public.team_member_roles (team_member_id, role) values
      (v_tm_id, 'team_admin'),
      (v_tm_id, 'manager')
    on conflict (team_member_id, role) do nothing;
  end if;

  -- Secretary and Accountant roles
  select id into v_tm_id from public.team_members where team_id = v_team1_id and user_id = v_u4;
  if v_tm_id is not null then
    insert into public.team_member_roles (team_member_id, role) values (v_tm_id, 'secretary')
    on conflict (team_member_id, role) do nothing;
  end if;

  select id into v_tm_id from public.team_members where team_id = v_team1_id and user_id = v_u5;
  if v_tm_id is not null then
    insert into public.team_member_roles (team_member_id, role) values (v_tm_id, 'accountant')
    on conflict (team_member_id, role) do nothing;
  end if;

  -- Team 2 Roles (base role player)
  insert into public.team_member_roles (team_member_id, role)
  select tm.id, 'player'
  from public.team_members tm
  where tm.team_id = v_team2_id
  on conflict (team_member_id, role) do nothing;

  select id into v_tm_id from public.team_members where team_id = v_team2_id and user_id = v_gestor_id;
  if v_tm_id is not null then
    insert into public.team_member_roles (team_member_id, role) values
      (v_tm_id, 'team_admin'),
      (v_tm_id, 'manager'),
      (v_tm_id, 'secretary'),
      (v_tm_id, 'accountant')
    on conflict (team_member_id, role) do nothing;
  end if;

  -- 6. Convocations for Team 1
  -- Convocation 1: Open upcoming convocation with votes
  insert into public.convocations (id, team_id, title, scheduled_at, status, created_by, game_definition_key) values
    (v_conv1_id, v_team1_id, 'Futebolada das Terças', now() + interval '2 days', 'open', v_gestor_id, 'day:2-20:30')
  on conflict (id) do nothing;

  -- Votes for Convocation 1 (10 ball votes -> Quorum reached ready to accept)
  insert into public.convocation_votes (convocation_id, user_id, state) values
    (v_conv1_id, v_gestor_id, 'ball'),
    (v_conv1_id, v_jogador_id, 'ball'),
    (v_conv1_id, v_u4, 'ball'),
    (v_conv1_id, v_u5, 'ball'),
    (v_conv1_id, v_u6, 'ball'),
    (v_conv1_id, v_u7, 'ball'),
    (v_conv1_id, v_u8, 'ball'),
    (v_conv1_id, v_u9, 'ball'),
    (v_conv1_id, v_u10, 'ball'),
    (v_conv1_id, v_u11, 'ball'),
    (v_conv1_id, v_u12, 'couch')
  on conflict (convocation_id, user_id) do update set state = excluded.state;

  -- Convocation 2: Accepted convocation (transitioned to game)
  insert into public.convocations (id, team_id, title, scheduled_at, status, created_by, game_definition_key) values
    (v_conv2_id, v_team1_id, 'Futebolada das Terças', now() - interval '7 days', 'accepted', v_gestor_id, 'day:2-20:30')
  on conflict (id) do nothing;

  -- 7. Real Games for Team 1
  -- Game 1: Completed (Shirts 7 - 4 Coletes)
  insert into public.games (
    id, convocation_id, team_id, scheduled_at, status,
    shirts_score, coletes_score, completed_at, created_by,
    shirts_lineup, coletes_lineup
  ) values (
    v_game1_id, v_conv2_id, v_team1_id, now() - interval '14 days', 'completed',
    7, 4, now() - interval '14 days', v_gestor_id,
    jsonb_build_array(
      jsonb_build_object('id', v_gestor_id, 'name', 'Tiago Gestor', 'slot', 0, 'isGuest', false),
      jsonb_build_object('id', v_jogador_id, 'name', 'Bernardo Jogador', 'slot', 1, 'isGuest', false),
      jsonb_build_object('id', v_u4, 'name', 'Rui Pedro', 'slot', 2, 'isGuest', false),
      jsonb_build_object('id', v_u5, 'name', 'João Santos', 'slot', 3, 'isGuest', false),
      jsonb_build_object('id', v_u6, 'name', 'Gonçalo Ramos', 'slot', 4, 'isGuest', false)
    ),
    jsonb_build_array(
      jsonb_build_object('id', v_u7, 'name', 'André Horta', 'slot', 0, 'isGuest', false),
      jsonb_build_object('id', v_u8, 'name', 'Miguel Lourenço', 'slot', 1, 'isGuest', false),
      jsonb_build_object('id', v_u9, 'name', 'Diogo Jota', 'slot', 2, 'isGuest', false),
      jsonb_build_object('id', v_u10, 'name', 'Pedro Neto', 'slot', 3, 'isGuest', false),
      jsonb_build_object('id', v_u11, 'name', 'Nuno Mendes', 'slot', 4, 'isGuest', false)
    )
  ) on conflict (id) do nothing;

  -- Game 2: Completed (Shirts 5 - 6 Coletes)
  insert into public.games (
    id, convocation_id, team_id, scheduled_at, status,
    shirts_score, coletes_score, completed_at, created_by,
    shirts_lineup, coletes_lineup
  ) values (
    v_game2_id, null, v_team1_id, now() - interval '7 days', 'completed',
    5, 6, now() - interval '7 days', v_gestor_id,
    jsonb_build_array(
      jsonb_build_object('id', v_gestor_id, 'name', 'Tiago Gestor', 'slot', 0, 'isGuest', false),
      jsonb_build_object('id', v_u7, 'name', 'André Horta', 'slot', 1, 'isGuest', false),
      jsonb_build_object('id', v_u8, 'name', 'Miguel Lourenço', 'slot', 2, 'isGuest', false),
      jsonb_build_object('id', v_u9, 'name', 'Diogo Jota', 'slot', 3, 'isGuest', false),
      jsonb_build_object('id', v_u10, 'name', 'Pedro Neto', 'slot', 4, 'isGuest', false)
    ),
    jsonb_build_array(
      jsonb_build_object('id', v_jogador_id, 'name', 'Bernardo Jogador', 'slot', 0, 'isGuest', false),
      jsonb_build_object('id', v_u4, 'name', 'Rui Pedro', 'slot', 1, 'isGuest', false),
      jsonb_build_object('id', v_u5, 'name', 'João Santos', 'slot', 2, 'isGuest', false),
      jsonb_build_object('id', v_u6, 'name', 'Gonçalo Ramos', 'slot', 3, 'isGuest', false),
      jsonb_build_object('id', v_u11, 'name', 'Nuno Mendes', 'slot', 4, 'isGuest', false)
    )
  ) on conflict (id) do nothing;

  -- Game 3: Completed (Shirts 4 - 4 Coletes - Draw)
  insert into public.games (
    id, convocation_id, team_id, scheduled_at, status,
    shirts_score, coletes_score, completed_at, created_by,
    shirts_lineup, coletes_lineup
  ) values (
    v_game3_id, null, v_team1_id, now() - interval '1 day', 'completed',
    4, 4, now() - interval '1 day', v_gestor_id,
    jsonb_build_array(
      jsonb_build_object('id', v_jogador_id, 'name', 'Bernardo Jogador', 'slot', 0, 'isGuest', false),
      jsonb_build_object('id', v_u4, 'name', 'Rui Pedro', 'slot', 1, 'isGuest', false),
      jsonb_build_object('id', v_u7, 'name', 'André Horta', 'slot', 2, 'isGuest', false),
      jsonb_build_object('id', v_u8, 'name', 'Miguel Lourenço', 'slot', 3, 'isGuest', false),
      jsonb_build_object('id', v_u12, 'name', 'Rafael Leão', 'slot', 4, 'isGuest', false)
    ),
    jsonb_build_array(
      jsonb_build_object('id', v_gestor_id, 'name', 'Tiago Gestor', 'slot', 0, 'isGuest', false),
      jsonb_build_object('id', v_u5, 'name', 'João Santos', 'slot', 1, 'isGuest', false),
      jsonb_build_object('id', v_u6, 'name', 'Gonçalo Ramos', 'slot', 2, 'isGuest', false),
      jsonb_build_object('id', v_u9, 'name', 'Diogo Jota', 'slot', 3, 'isGuest', false),
      jsonb_build_object('id', v_u10, 'name', 'Pedro Neto', 'slot', 4, 'isGuest', false)
    )
  ) on conflict (id) do nothing;

  -- Game 4: Scheduled upcoming game (not completed yet)
  insert into public.games (
    id, convocation_id, team_id, scheduled_at, status,
    shirts_score, coletes_score, completed_at, created_by,
    shirts_lineup, coletes_lineup
  ) values (
    v_game4_id, null, v_team1_id, now() + interval '5 days', 'scheduled',
    null, null, null, v_gestor_id,
    jsonb_build_array(
      jsonb_build_object('id', v_gestor_id, 'name', 'Tiago Gestor', 'slot', 0, 'isGuest', false),
      jsonb_build_object('id', v_jogador_id, 'name', 'Bernardo Jogador', 'slot', 1, 'isGuest', false),
      jsonb_build_object('id', v_u4, 'name', 'Rui Pedro', 'slot', 2, 'isGuest', false),
      jsonb_build_object('id', v_u5, 'name', 'João Santos', 'slot', 3, 'isGuest', false),
      jsonb_build_object('id', v_u6, 'name', 'Gonçalo Ramos', 'slot', 4, 'isGuest', false)
    ),
    jsonb_build_array(
      jsonb_build_object('id', v_u7, 'name', 'André Horta', 'slot', 0, 'isGuest', false),
      jsonb_build_object('id', v_u8, 'name', 'Miguel Lourenço', 'slot', 1, 'isGuest', false),
      jsonb_build_object('id', v_u9, 'name', 'Diogo Jota', 'slot', 2, 'isGuest', false),
      jsonb_build_object('id', v_u10, 'name', 'Pedro Neto', 'slot', 3, 'isGuest', false),
      jsonb_build_object('id', v_u11, 'name', 'Nuno Mendes', 'slot', 4, 'isGuest', false)
    )
  ) on conflict (id) do nothing;

end $$;

-- ============================================================================
-- Direct 2 DJ — LOCAL DATABASE SEED ONLY (supabase db reset)
-- ============================================================================
-- • Runs after migrations as the database owner (auth.uid() is null).
-- • Uses fake emails @direct2dj.test and password documented below — never production.
-- • Fixtures use fixed UUIDs for repeatable smoke tests (not app hardcoding).
-- • Login password for all seed users (local only): Seed-local-only-v1
-- • Do not run this file against production; use `supabase db reset` locally only.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Auth: four users (artist, dj, admin, inactive artist)
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  '11111111-1111-4111-8111-111111111101'::uuid,
  'authenticated',
  'authenticated',
  'artist.seed@direct2dj.test',
  crypt('Seed-local-only-v1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Seed Artist"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  '22222222-2222-4222-8222-222222222202'::uuid,
  'authenticated',
  'authenticated',
  'dj.seed@direct2dj.test',
  crypt('Seed-local-only-v1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Seed DJ"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  '33333333-3333-4333-8333-333333333303'::uuid,
  'authenticated',
  'authenticated',
  'admin.seed@direct2dj.test',
  crypt('Seed-local-only-v1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Seed Admin"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  '44444444-4444-4444-8444-444444444404'::uuid,
  'authenticated',
  'authenticated',
  'inactive.seed@direct2dj.test',
  crypt('Seed-local-only-v1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Seed Inactive Artist"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Email identities (required for password sign-in in local GoTrue)
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values
(
  gen_random_uuid(),
  '11111111-1111-4111-8111-111111111101'::uuid,
  jsonb_build_object(
    'sub', '11111111-1111-4111-8111-111111111101',
    'email', 'artist.seed@direct2dj.test',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  '11111111-1111-4111-8111-111111111101'::uuid,
  now(),
  now(),
  now()
),
(
  gen_random_uuid(),
  '22222222-2222-4222-8222-222222222202'::uuid,
  jsonb_build_object(
    'sub', '22222222-2222-4222-8222-222222222202',
    'email', 'dj.seed@direct2dj.test',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  '22222222-2222-4222-8222-222222222202'::uuid,
  now(),
  now(),
  now()
),
(
  gen_random_uuid(),
  '33333333-3333-4333-8333-333333333303'::uuid,
  jsonb_build_object(
    'sub', '33333333-3333-4333-8333-333333333303',
    'email', 'admin.seed@direct2dj.test',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  '33333333-3333-4333-8333-333333333303'::uuid,
  now(),
  now(),
  now()
),
(
  gen_random_uuid(),
  '44444444-4444-4444-8444-444444444404'::uuid,
  jsonb_build_object(
    'sub', '44444444-4444-4444-8444-444444444404',
    'email', 'inactive.seed@direct2dj.test',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  '44444444-4444-4444-8444-444444444404'::uuid,
  now(),
  now(),
  now()
);

-- ---------------------------------------------------------------------------
-- Roles: DJ + admin (seed runs as superuser; profiles_role_guard allows null uid)
-- ---------------------------------------------------------------------------

update public.profiles
set role = 'dj'::public.user_role
where id = '22222222-2222-4222-8222-222222222202'::uuid;

update public.profiles
set role = 'admin'::public.user_role
where id = '33333333-3333-4333-8333-333333333303'::uuid;

-- Inactive artist profile stays artist; deactivate artist extension row
update public.artists
set status = 'inactive'::public.lifecycle_status
where profile_id = '44444444-4444-4444-8444-444444444404'::uuid;

-- ---------------------------------------------------------------------------
-- Tracks: one pending + one approved (main artist); one approved on inactive artist
-- ---------------------------------------------------------------------------

insert into public.tracks (id, artist_id, title, description, moderation_status)
values
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'::uuid,
  (select id from public.artists where profile_id = '11111111-1111-4111-8111-111111111101'::uuid limit 1),
  '[seed] Pending track',
  'Smoke test: DJ must not see until approved.',
  'pending'::public.approval_status
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02'::uuid,
  (select id from public.artists where profile_id = '11111111-1111-4111-8111-111111111101'::uuid limit 1),
  '[seed] Approved track',
  'Smoke test: DJ can see when artist active.',
  'approved'::public.approval_status
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03'::uuid,
  (select id from public.artists where profile_id = '44444444-4444-4444-8444-444444444404'::uuid limit 1),
  '[seed] Inactive artist approved track',
  'Smoke test: hidden from DJs via track_is_visible_to_dj.',
  'approved'::public.approval_status
);

commit;

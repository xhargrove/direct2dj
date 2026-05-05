-- ============================================================================
-- Digital Service Pack — LOCAL DATABASE SEED ONLY (supabase db reset)
-- ============================================================================
-- • Runs after migrations as the database owner (auth.uid() is null).
-- • Phase 4.5 smoke accounts use @example.com — local/staging only; never production.
-- • Shared password (local smoke only): Password123!
-- • Legacy smoke-domain users were replaced by deterministic smoke identities below.
-- • Do not run this file against production.
-- ============================================================================

begin;

-- Fixed UUIDs for repeatable smoke / docs (not referenced in app code).
-- Profiles e1000001–e1000006
-- Tracks f2000001–f2000006

-- ---------------------------------------------------------------------------
-- Auth users (signInWithPassword requires identities + email_confirmed_at)
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
  'e1000001-0000-4000-8000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'smoke-artist@example.com',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Smoke Artist"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  'e1000002-0000-4000-8000-000000000002'::uuid,
  'authenticated',
  'authenticated',
  'smoke-approved-dj@example.com',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Smoke Approved DJ"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  'e1000003-0000-4000-8000-000000000003'::uuid,
  'authenticated',
  'authenticated',
  'smoke-pending-dj@example.com',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Smoke Pending DJ"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  'e1000004-0000-4000-8000-000000000004'::uuid,
  'authenticated',
  'authenticated',
  'smoke-suspended-dj@example.com',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Smoke Suspended DJ"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  'e1000005-0000-4000-8000-000000000005'::uuid,
  'authenticated',
  'authenticated',
  'smoke-admin@example.com',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Smoke Admin"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
  'e1000006-0000-4000-8000-000000000006'::uuid,
  'authenticated',
  'authenticated',
  'smoke-inactive-artist@example.com',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Smoke Inactive Artist"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

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
  'e1000001-0000-4000-8000-000000000001'::uuid,
  jsonb_build_object(
    'sub', 'e1000001-0000-4000-8000-000000000001',
    'email', 'smoke-artist@example.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  'e1000001-0000-4000-8000-000000000001'::uuid,
  now(),
  now(),
  now()
),
(
  gen_random_uuid(),
  'e1000002-0000-4000-8000-000000000002'::uuid,
  jsonb_build_object(
    'sub', 'e1000002-0000-4000-8000-000000000002',
    'email', 'smoke-approved-dj@example.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  'e1000002-0000-4000-8000-000000000002'::uuid,
  now(),
  now(),
  now()
),
(
  gen_random_uuid(),
  'e1000003-0000-4000-8000-000000000003'::uuid,
  jsonb_build_object(
    'sub', 'e1000003-0000-4000-8000-000000000003',
    'email', 'smoke-pending-dj@example.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  'e1000003-0000-4000-8000-000000000003'::uuid,
  now(),
  now(),
  now()
),
(
  gen_random_uuid(),
  'e1000004-0000-4000-8000-000000000004'::uuid,
  jsonb_build_object(
    'sub', 'e1000004-0000-4000-8000-000000000004',
    'email', 'smoke-suspended-dj@example.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  'e1000004-0000-4000-8000-000000000004'::uuid,
  now(),
  now(),
  now()
),
(
  gen_random_uuid(),
  'e1000005-0000-4000-8000-000000000005'::uuid,
  jsonb_build_object(
    'sub', 'e1000005-0000-4000-8000-000000000005',
    'email', 'smoke-admin@example.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  'e1000005-0000-4000-8000-000000000005'::uuid,
  now(),
  now(),
  now()
),
(
  gen_random_uuid(),
  'e1000006-0000-4000-8000-000000000006'::uuid,
  jsonb_build_object(
    'sub', 'e1000006-0000-4000-8000-000000000006',
    'email', 'smoke-inactive-artist@example.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  'e1000006-0000-4000-8000-000000000006'::uuid,
  now(),
  now(),
  now()
);

-- ---------------------------------------------------------------------------
-- Roles (superuser: profiles_role_guard allows null auth.uid())
-- Order: set DJ + admin; inactive artist profile stays artist
-- ---------------------------------------------------------------------------

update public.profiles
set role = 'admin'::public.user_role
where id = 'e1000005-0000-4000-8000-000000000005'::uuid;

update public.profiles
set role = 'dj'::public.user_role
where id in (
  'e1000002-0000-4000-8000-000000000002'::uuid,
  'e1000003-0000-4000-8000-000000000003'::uuid,
  'e1000004-0000-4000-8000-000000000004'::uuid
);

-- ---------------------------------------------------------------------------
-- DJ vetting (djs rows created by profile role sync; default = pending)
-- ---------------------------------------------------------------------------

update public.djs
set vetting_status = 'approved'::public.dj_vetting_status
where profile_id = 'e1000002-0000-4000-8000-000000000002'::uuid;

update public.djs
set vetting_status = 'pending'::public.dj_vetting_status
where profile_id = 'e1000003-0000-4000-8000-000000000003'::uuid;

update public.djs
set vetting_status = 'suspended'::public.dj_vetting_status
where profile_id = 'e1000004-0000-4000-8000-000000000004'::uuid;

-- Inactive artist (G matrix: hidden from DJ catalog)
update public.artists
set status = 'inactive'::public.lifecycle_status
where profile_id = 'e1000006-0000-4000-8000-000000000006'::uuid;

-- ---------------------------------------------------------------------------
-- Tracks (smoke-artist = active; smoke-inactive-artist = inactive)
-- ---------------------------------------------------------------------------

insert into public.tracks (
  id,
  artist_id,
  title,
  description,
  moderation_status,
  credit_artist_name,
  genre,
  bpm,
  explicit_rating,
  is_draft,
  catalog_active
)
values
(
  'f2000001-0000-4000-8000-000000000001'::uuid,
  (select a.id from public.artists a where a.profile_id = 'e1000001-0000-4000-8000-000000000001'::uuid limit 1),
  '[smoke] Pending moderation',
  'Visibility: pending — not in DJ feed.',
  'pending'::public.approval_status,
  'Smoke Artist',
  'Hip-Hop',
  120.0,
  'clean'::public.explicit_rating,
  false,
  true
),
(
  'f2000002-0000-4000-8000-000000000002'::uuid,
  (select a.id from public.artists a where a.profile_id = 'e1000001-0000-4000-8000-000000000001'::uuid limit 1),
  '[smoke] Approved visible + pack',
  'Primary happy-path track for DJ feed / detail / preview / pack.',
  'approved'::public.approval_status,
  'Smoke Artist',
  'Hip-Hop',
  120.0,
  'clean'::public.explicit_rating,
  false,
  true
),
(
  'f2000003-0000-4000-8000-000000000003'::uuid,
  (select a.id from public.artists a where a.profile_id = 'e1000001-0000-4000-8000-000000000001'::uuid limit 1),
  '[smoke] Catalog inactive',
  'Approved but catalog_active=false — hidden from feed.',
  'approved'::public.approval_status,
  'Smoke Artist',
  'Hip-Hop',
  100.0,
  'clean'::public.explicit_rating,
  false,
  false
),
(
  'f2000004-0000-4000-8000-000000000004'::uuid,
  (select a.id from public.artists a where a.profile_id = 'e1000001-0000-4000-8000-000000000001'::uuid limit 1),
  '[smoke] Rejected',
  'Rejected — not in catalog.',
  'rejected'::public.approval_status,
  'Smoke Artist',
  'Hip-Hop',
  90.0,
  'clean'::public.explicit_rating,
  false,
  true
),
(
  'f2000005-0000-4000-8000-000000000005'::uuid,
  (select a.id from public.artists a where a.profile_id = 'e1000006-0000-4000-8000-000000000006'::uuid limit 1),
  '[smoke] Inactive artist approved',
  'Approved but artist lifecycle inactive — not visible to DJ.',
  'approved'::public.approval_status,
  'Inactive Artist',
  'House',
  128.0,
  'clean'::public.explicit_rating,
  false,
  true
),
(
  'f2000006-0000-4000-8000-000000000006'::uuid,
  (select a.id from public.artists a where a.profile_id = 'e1000001-0000-4000-8000-000000000001'::uuid limit 1),
  '[smoke] No pack files',
  'Visible in feed but no track_files — pack/preview edge case.',
  'approved'::public.approval_status,
  'Smoke Artist',
  'Hip-Hop',
  110.0,
  'clean'::public.explicit_rating,
  false,
  true
);

-- ---------------------------------------------------------------------------
-- track_files (storage_path prefix = artist profile_id for RLS)
-- f2000002: cover + audio pack for preview + download
-- ---------------------------------------------------------------------------

insert into public.track_files (
  track_id,
  kind,
  pack_slot,
  storage_path,
  mime_type,
  sort_order
)
values
(
  'f2000002-0000-4000-8000-000000000002'::uuid,
  'cover'::public.track_file_kind,
  'cover_art'::public.pack_slot,
  'e1000001-0000-4000-8000-000000000001/smoke-visible/cover.jpg',
  'image/jpeg',
  0
),
(
  'f2000002-0000-4000-8000-000000000002'::uuid,
  'audio'::public.track_file_kind,
  'radio_edit'::public.pack_slot,
  'e1000001-0000-4000-8000-000000000001/smoke-visible/radio.mp3',
  'audio/mpeg',
  1
),
(
  'f2000002-0000-4000-8000-000000000002'::uuid,
  'audio'::public.track_file_kind,
  'dirty_full'::public.pack_slot,
  'e1000001-0000-4000-8000-000000000001/smoke-visible/dirty.mp3',
  'audio/mpeg',
  2
);

-- ---------------------------------------------------------------------------
-- storage.objects (promos bucket) — enables createSignedUrl in local smoke
-- ---------------------------------------------------------------------------

insert into storage.objects (bucket_id, name, owner, metadata)
values
(
  'promos',
  'e1000001-0000-4000-8000-000000000001/smoke-visible/cover.jpg',
  'e1000001-0000-4000-8000-000000000001'::uuid,
  '{"mimetype":"image/jpeg"}'::jsonb
),
(
  'promos',
  'e1000001-0000-4000-8000-000000000001/smoke-visible/radio.mp3',
  'e1000001-0000-4000-8000-000000000001'::uuid,
  '{"mimetype":"audio/mpeg"}'::jsonb
),
(
  'promos',
  'e1000001-0000-4000-8000-000000000001/smoke-visible/dirty.mp3',
  'e1000001-0000-4000-8000-000000000001'::uuid,
  '{"mimetype":"audio/mpeg"}'::jsonb
);

commit;

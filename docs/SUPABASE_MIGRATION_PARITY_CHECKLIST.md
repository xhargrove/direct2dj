# Supabase migration parity checklist

**Honest statement:** Parity is **not** proven until migrations are applied to the **target** database and verified with SQL below. The repo only tracks **intent**.

See also **[LAUNCH_VERIFIED.md](./LAUNCH_VERIFIED.md)** for the full launch gate.

## Apply migrations

From project root (CLI linked via `npm run db:link`):

```bash
npm run db:push
```

Equivalent: Supabase Dashboard → SQL → run migration files in order (error-prone; prefer CLI).

**Rollback:** Supabase migrations are **forward-only** in typical workflows; restore from backup or write compensating migration — **do not** assume down migrations exist.

## RPCs the app depends on (non-exhaustive)

Verify existence:

```sql
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'public_active_featured_tracks',
    'public_spotlight_hub',
    'public_spotlight_editorial',
    'public_spotlight_sponsored',
    'public_spotlight_leaderboard',
    'spotlight_track_card',
    'promos_object_is_active_featured_cover',
    'promos_object_is_active_editorial_spotlight_cover',
    'admin_create_draft_track',
    'create_draft_track',
    'dj_catalog_feed',
    'admin_apply_track_review',
    'artist_featured_campaign_stats',
    'artist_track_featured_rows',
    'is_co_admin',
    'is_upload_operator'
  )
order by proname;
```

## Storage

- **Bucket:** `promos` (see migrations / dashboard).
- Policies: artists upload under auth uid prefix; DJs/admins read per existing policies.
- **Public anon cover read:** active **Featured Spotlight** covers (`20260531190000_*`) and active **editorial spotlight** covers (`20260602120000_*`).
- **Algorithmic hub covers** on public pages: server uses `SUPABASE_SERVICE_ROLE_KEY` when set (recommended in production).

## RLS

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'tracks',
    'featured_placements',
    'editorial_spotlights',
    'admin_broadcasts',
    'profiles',
    'payments'
  )
order by tablename;
```

Expect `rowsecurity = true` for protected tables.

## Required migration files (recent critical additions)

Include at least:

- `20260520193000_admin_broadcasts.sql` — DJ communications audit log
- `20260521110000_user_role_add_co_admin_enum.sql` — `co_admin` role
- `20260521120000_co_admin_upload_role.sql` — co-admin upload RLS
- `20260521130000_tracks_youtube_url.sql` — `tracks.youtube_url`
- `20260522120000_public_featured_catalog.sql` — public featured catalog + anon featured covers
- `20260523120000_admin_create_draft_track.sql` — `admin_create_draft_track`
- `20260531200000_editorial_spotlights.sql` — editorial spotlights + hub RPCs
- `20260601120000_editorial_spotlight_slots_extend.sql` — extra editorial enum values (separate txn)
- `20260601120001_editorial_spotlight_hub_extend.sql` — hub RPC with 5 editorial slots
- `20260602120000_public_editorial_spotlight_cover_storage.sql` — anon editorial cover Storage policy
- Earlier: `dj_catalog_feed`, RLS, billing, notifications (full set under `supabase/migrations/`)

## Production deployment steps

1. **Backup** production DB if it holds real data.
2. **`npm run db:link`** to production Supabase project.
3. **`npm run db:push`** (or Dashboard migration runner).
4. Run verification SQL above.
5. Run **`npm run verify:launch`** in the repo.
6. Smoke test per **`PRODUCTION_SMOKE_TEST_PLAN.md`** and **`LAUNCH_VERIFIED.md`**.

## Scripts reference

| Script | Notes |
|--------|------|
| `npm run db:push` | `npx supabase db push` |
| `npm run db:link` | Link CLI to remote |
| `npm run db:status` | Local stack status |
| `npm run verify:launch` | lint + typecheck + test + build |

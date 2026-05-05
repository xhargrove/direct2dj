# Supabase migration parity checklist

**Honest statement:** Parity is **not** proven until migrations are applied to the **target** database and verified with SQL below. The repo only tracks **intent**.

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
    'admin_create_draft_track',
    'create_draft_track',
    'dj_catalog_feed',
    'admin_apply_track_review',
    'artist_featured_campaign_stats',
    'artist_track_featured_rows'
  )
order by proname;
```

## Storage

- **Bucket:** `promos` (see migrations / dashboard).
- Policies: artists upload under auth uid prefix; DJs/admins read per existing policies; **public featured covers** may require migration `20260522120000_public_featured_catalog.sql` for anon read of active featured covers.

## RLS

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('tracks', 'featured_placements', 'profiles', 'payments')
order by tablename;
```

Expect `rowsecurity = true` for protected tables.

## Required migration files (recent critical additions)

Include at least:

- `20260522120000_public_featured_catalog.sql` — `public_active_featured_tracks`, anon storage policy for featured covers
- `20260523120000_admin_create_draft_track.sql` — `admin_create_draft_track`
- Earlier: `dj_catalog_feed`, RLS, billing, notifications (full set under `supabase/migrations/`)

## Production deployment steps

1. **Backup** production DB if it holds real data.
2. **`npm run db:link`** to production Supabase project.
3. **`npm run db:push`** (or Dashboard migration runner).
4. Run verification SQL above.
5. Smoke test `/featured` and admin **New track (no fee)**.

## Scripts reference

| Script | Notes |
|--------|------|
| `npm run db:push` | `npx supabase db push` |
| `npm run db:link` | Link CLI to remote |
| `npm run db:status` | Local stack status |

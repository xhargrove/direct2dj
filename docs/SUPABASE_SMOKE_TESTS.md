# Supabase smoke tests (manual)

Use these checks after migrations are applied (**local** `npm run db:reset` or **remote** SQL push). Local reset creates **Phase 4.5 smoke users** in `supabase/seed.sql` (fixed UUIDs, `@example.com` — **not** for production).

**Rules:** Use the **anon / publishable** key and real JWTs only (Studio “Run as user” or app login). Do **not** paste the service role key into the browser.

**Docker / CLI issues** (`command not found`, `No such container`, `npm` + `#` errors, `db query` extra args): see [`LOCAL_SUPABASE.md`](LOCAL_SUPABASE.md).

---

## Prerequisites

1. Migrations applied (current branch / `supabase/migrations`). Profile guard and catalog rules are part of the chain.
2. Local-only seed: `npm run db:reset` runs `supabase/seed.sql` (see `config.toml` `[db.seed]`). **Never run seed against production.**
3. **Seed login (local only):** password **`Password123!`** (test-only) for:
   - `smoke-artist@example.com` — **artist** (active)
   - `smoke-approved-dj@example.com` — **dj**, `djs.vetting_status = approved`
   - `smoke-pending-dj@example.com` — **dj**, `djs.vetting_status = pending`
   - `smoke-suspended-dj@example.com` — **dj**, `djs.vetting_status = suspended`
   - `smoke-admin@example.com` — **admin**
   - `smoke-inactive-artist@example.com` — **artist** with `artists.status = inactive` (catalog negative case)
4. After reset, run **`npm run smoke:accounts`** (SQL checks against **local** DB; requires **`npm run db:start`** + **`npm run db:reset`** first). **Set Next.js `.env.local`** to the **same** local Supabase URL and anon key (`npm run db:status`) before `/login` smoke.
5. Supabase Studio → **Authentication → Users** should list the six `smoke-*@example.com` users after reset.
6. For API tests: REST or JS client with `Authorization: Bearer <access_token>` for each role.

---

## Test matrix

| # | Case | Expected |
|---|------|----------|
| 1 | Artist A creates a track (`artist_id` = own) | **Pass** — row inserted; `moderation_status` stored as `pending` even if client sent `approved`. |
| 2 | Artist A updates own track title **without** changing `moderation_status` | **Pass**. |
| 3 | Artist A updates own track setting `moderation_status` to `approved` | **Fail** — trigger error: only admins can approve/reject. |
| 4 | Artist A updates a track whose `artist_id` belongs to Artist B | **Fail** — RLS: no row matched / policy violation. |
| 5 | DJ selects `tracks` where `moderation_status = pending` | **Fail** — no rows returned for DJ (pending not visible via `track_is_visible_to_dj`). |
| 6 | DJ selects approved track with active artist | **Pass** — row visible. |
| 7 | DJ inserts `downloads` for pending track | **Fail** — `track_is_visible_to_dj` false. |
| 8 | DJ inserts `downloads` for approved + active-artist track | **Pass**. |
| 9 | DJ inserts `downloads` for approved track but artist `status = inactive` | **Fail** — not visible to DJ. |
| 10 | DJ rates same track twice (two inserts same `track_id`, `dj_id`) | **Fail** — unique violation on `ratings_track_dj_unique`. |
| 11 | DJ inserts `feedback` for pending track | **Fail** — insert policy requires `track_is_visible_to_dj`. |
| 12 | Admin updates `tracks.moderation_status` to `approved` or `rejected` | **Pass**. |
| 13 | Non-admin inserts `featured_placements` | **Fail** — policy requires `is_admin`. |
| 14 | Non-admin updates `featured_placements` | **Fail**. |
| 15 | DJ selects tracks only from inactive artist (approved rows exist) | **Fail** visibility — `track_is_visible_to_dj` requires active artist. |

---

## Suggested SQL snippets (Studio SQL editor)

Run **set role** is not available for JWT; use **SQL as postgres** only for infrastructure checks, not for simulating RLS. Prefer **PostgREST with user JWT** or Table Editor with “View as user”.

To verify constraints exist:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.ratings'::regclass;
```

To verify triggers exist:

```sql
select tgname from pg_trigger
where tgrelid = 'public.tracks'::regclass
  and not tgisinternal;
```

---

## When automated API tests are absent

Unit tests: `npm test` (Vitest) cover `lib/dj/catalog-validation` only. **RLS** and **Auth** policy behavior must still be validated with:

1. Manual REST/Studio checks above.  
2. Local smoke users + login through the Next.js app (`/login`) after `npm run db:reset`.  
3. Optional: add more Vitest with `@supabase/supabase-js` using test JWTs.

---

## Exact local commands

From repository root (`direct2dj/`):

```bash
# CLI: use the repo devDependency (no global install required):
# npm run db:start   → npx supabase start
# npm run db:reset   → npx supabase db reset

# Start local stack (Docker Desktop required)
npm run db:start

# Apply migrations + run seed (seed is destructive reset)
npm run db:reset

# Or link remote project and push migrations only (no seed on remote unless you run SQL manually)
npm run db:push
```

Next.js app (separate terminal):

```bash
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to local (`npm run db:status` prints these)

npm run build
npm run dev
```

Local Supabase API default: `http://127.0.0.1:54321`.

---

## Failure triage

| Symptom | Check |
|---------|--------|
| Artist can self-approve | Trigger `tracks_enforce_moderation_rules` missing or `auth.uid()` null in session |
| DJ sees pending | SELECT policy or `track_is_visible_to_dj` definition |
| Duplicate rating inserts succeed | Unique constraint missing — re-run migrations |
| Seed breaks auth | Supabase version / `auth.users` shape — see comments in `supabase/seed.sql` |

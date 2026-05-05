# Digital Service Pack — foundation

This document describes the initial structure you asked for: **route map**, **database schema plan**, and **environment checklist**. The executable source of truth for SQL is `supabase/migrations/`.

**Phase 1 verification (RLS & smoke tests):**

- [`docs/RLS_VERIFICATION.md`](RLS_VERIFICATION.md) — role/table rule matrix and migration audit notes  
- [`docs/SUPABASE_SMOKE_TESTS.md`](SUPABASE_SMOKE_TESTS.md) — manual QA checklist and commands  
- [`docs/ADMIN_REVIEW.md`](ADMIN_REVIEW.md) — admin route map, moderation rules, storage signing, featured placement semantics, audit append-only policy  
- [`supabase/seed.sql`](../supabase/seed.sql) — local-only fixtures (`npm run db:reset`); Phase 4.5 smoke users `smoke-*@example.com` and catalog rows (see `docs/SUPABASE_SMOKE_TESTS.md`)

## Route map

| Path | Access | Purpose |
|------|--------|---------|
| `/` | Public | Marketing shell; shows session-aware links (workspace, sign in, sign out). |
| `/login` | Public | Email/password sign-in and sign-up via Supabase Auth (`signInWithPassword`, `signUp`). |
| `/auth/callback` | OAuth / magic-link return | Exchanges `code` for a session (`exchangeCodeForSession`) and redirects safely in-app. |
| `/auth/sign-out` | Authenticated | POST-only route handler; clears the Supabase session and redirects to `/login`. |
| `/artist` | `profiles.role = artist` | Artist workspace (layout enforces role). |
| `/dj` | `profiles.role = dj` | DJ workspace (layout enforces role). |
| `/admin` | `profiles.role = admin` | Admin workspace (layout enforces role); [`docs/ADMIN_REVIEW.md`](ADMIN_REVIEW.md) lists `/admin/dashboard`, submissions, tracks, artists, DJs, featured. |
| `POST /api/webhooks/stripe` | Stripe servers | Verifies `Stripe-Signature`; extend `switch (event.type)` for billing logic using the **service role** or Stripe APIs — never trust client-only checks for paid features. |

Canonical role homes are **`/artist`**, **`/dj`**, and **`/admin`** only (no duplicate `/dashboard/*` tree).

## Database schema plan

Apply migrations in order under `supabase/migrations/`.

### Bootstrap (`20260503120000_init_direct2dj.sql`)

| Object | Notes |
|--------|--------|
| `public.user_role` enum | `artist`, `dj`, `admin`. |
| `public.profiles` | One row per `auth.users` row; `role` defaults to `artist`. Created by `on_auth_user_created` trigger (optional `full_name` from signup metadata). **Do not** use `user_metadata` for authorization; `role` is in Postgres (RLS + triggers). |
| `public.stripe_customers` | `user_id` ↔ `stripe_customer_id` (server-side billing only). |
| `storage.buckets.promos` | Private; paths under `{auth.uid()}/` for owner CRUD. |
| RLS | `profiles`, `stripe_customers`; `public.is_admin(uuid)` is `SECURITY DEFINER`; role changes only by admins (`profiles_guard_role_change`). |

### Domain (`20260504120000_domain_tables_rls.sql`)

| Enum / table | Purpose |
|----------------|---------|
| `approval_status` | `pending`, `approved`, `rejected` |
| `lifecycle_status` | `active`, `inactive` |
| `track_file_kind` | `audio`, `cover`, `stem`, `other` |
| `artists` | Artist profile extension (`profile_id` 1:1); timestamps + `status`. |
| `djs` | DJ profile extension (`profile_id` 1:1); timestamps + `status`. |
| `tracks` | Belongs to `artists`; `moderation_status` for catalog approval. |
| `dj_packs` | Belongs to `djs`; pack `status`. |
| `track_files` | Files per track (`storage_path`, `kind`, metadata). |
| `downloads` | DJ download events (`track_id`, `dj_id`); `status`. |
| `ratings` | One rating per `(track_id, dj_id)`; score 1–5. |
| `feedback` | DJ feedback on tracks; `moderation_status`. |
| `featured_placements` | Featured slots for tracks; schedule + `moderation_status`. |
| `play_reports` | Reporting plays per DJ/track/period; `status`. |
| `admin_reviews` | Admin decisions on tracks (`reviewer_id` → `profiles`). |

**RLS summary:** Artists manage only their own tracks and related rows. DJs read/write **approved** catalog rows (`track_is_visible_to_dj`) — pending/rejected tracks are hidden from DJs. Admins use `public.is_admin()` for full access where policies allow. Helpers: `current_artist_id()`, `current_dj_id()`, `artist_owns_track()`, `track_is_visible_to_dj()` — all `SECURITY DEFINER`, no service-role bypass in the app tier.

**Signup extensions:** After insert/update on `profiles`, `sync_profile_role_extensions` ensures an `artists` row when `role = artist` and a `djs` row when `role = dj` (backfill included for existing profiles).

### Catalog & storage rules (`20260505120000_enforce_catalog_and_storage_rules.sql`)

| Requirement | How it is enforced |
|---------------|-------------------|
| Artist A cannot edit Artist B’s track | RLS on `tracks` (and children) requires `artist_owns_track(..., auth.uid())` or admin. |
| Artist cannot approve/reject own track | Trigger `tracks_enforce_moderation_rules`: only admins may change `moderation_status`; non-admin inserts are forced to `pending`. |
| DJ sees approved, active-artist tracks only | `track_is_visible_to_dj()` requires `moderation_status = approved` and `artists.status = active`. |
| DJ cannot see pending tracks | DJ `SELECT` on `tracks` goes through `track_is_visible_to_dj(id)` (pending fails). |
| DJ cannot download inactive-artist tracks | `downloads_insert_dj_approved_track` uses `track_is_visible_to_dj(track_id)` (includes active artist). |
| DJ cannot rate the same track twice | Unique constraint `ratings_track_dj_unique` on `(track_id, dj_id)`; use `UPDATE` to change score. |
| Admin approves/rejects tracks | Admins pass RLS on `tracks` and may update `moderation_status`; artists cannot. |
| Non-admin cannot insert featured rows | `featured_placements_write_admin` — insert/update/delete require `is_admin`. |
| Storage rows cannot point at another user’s objects | RLS ties `track_files.track_id` to owning artist; trigger `track_files_enforce_storage_path_prefix` requires `storage_path` like `{auth.uid()}/%` for non-admins (aligned with `promos` bucket prefix rules). |

When `auth.uid()` is null (e.g. service role), trigger checks are skipped so privileged server jobs still work; the **anon/publishable client must never use the service role key** in the browser.

### Profile role guard & local seed (`20260506100000_profiles_role_guard_maintenance.sql`)

The `profiles_guard_role_change` trigger blocks `profiles.role` updates for authenticated users unless `public.is_admin(auth.uid())`. When `auth.uid()` is **null** (database owner running `supabase/seed.sql` or maintenance SQL), role updates are allowed so local seed users can be assigned `dj` / `admin` without weakening JWT-backed rules.

**Operational note:** New accounts default to **`artist`**. In production, promote to **`dj`** or **`admin`** only via an admin session or controlled backend; the sync trigger adds the matching extension row when missing.

## Environment variable checklist

Copy `.env.example` to `.env.local` for local development.

| Variable | Required for | Notes |
|----------|----------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | App + middleware | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App + middleware | Browser-safe key (legacy name “anon”; publishable key in newer dashboards). Never use the service role key in `NEXT_PUBLIC_*`. |
| `NEXT_PUBLIC_SITE_URL` | Redirects, emails (future) | Production domain, e.g. your custom domain or Vercel URL. |
| `STRIPE_SECRET_KEY` | Webhooks + server billing | Server-only; use test keys in preview/staging. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client Checkout / Elements (when you add them) | Safe to expose. |
| `STRIPE_WEBHOOK_SECRET` | `POST /api/webhooks/stripe` | From Stripe Dashboard for this endpoint. |

On **Vercel**, set the same keys in Project → Settings → Environment Variables for Production and Preview as appropriate.

## Supabase Dashboard alignment

After deploying SQL:

1. **Auth → URL configuration:** add site URL and redirect URLs (`http://localhost:3000/**`, production origin).
2. **Auth providers:** enable Email (and any OAuth providers you plan to use).
3. **Storage:** confirm bucket `promos` exists if the migration ran successfully.

## Stripe alignment

1. Create a webhook endpoint pointing to `https://<your-domain>/api/webhooks/stripe`.
2. Subscribe to the events you will handle (`checkout.session.completed`, `customer.subscription.updated`, etc.).
3. Paste the signing secret into `STRIPE_WEBHOOK_SECRET`.

# Database schema (overview)

Schema is defined in SQL migrations under [`supabase/migrations/`](./supabase/migrations/). Apply with Supabase CLI (`supabase db push`) or the SQL editor.

## Core identity

| Table | Purpose |
|-------|---------|
| `profiles` | One row per `auth.users`; `role` = `artist` \| `dj` \| `admin`; email/name |
| `artists` | Artist profile; `profile_id` → `profiles` |
| `djs` | DJ profile; vetting (`vetting_status`), tier (`dj_tier`), privacy/contact flags |
| `dj_applications` | DJ application snapshot; linked to `djs` |

## Catalog & content

| Table | Purpose |
|-------|---------|
| `tracks` | Pack metadata, moderation (`moderation_status`), `catalog_active`, artist FK |
| `track_files` | Files per track (`pack_slot`, `storage_path`, MIME, sort order) |
| `admin_reviews` | Audit trail when admin approves/rejects |

## Engagement

| Table | Purpose |
|-------|---------|
| `downloads` | DJ pack download logs + manifest JSON |
| `ratings` | DJ ratings per track (unique `track_id`,`dj_id`) |
| `feedback` | DJ → artist text feedback; **unique** `(track_id, dj_id)` (one row per DJ per track, updated in place) |
| `play_reports` | DJ play reports (venue, dates, verification, etc.) |

## Featured & billing

| Table | Purpose |
|-------|---------|
| `pricing_plans` | Featured SKUs (duration, cents, Stripe price id) |
| `payments` | Checkout intent rows; links to Stripe session |
| `featured_placements` | Feature windows (`starts_at`,`ends_at`), moderation, payment FK, notification markers |

## Notifications

| Table | Purpose |
|-------|---------|
| `notifications` | Per-user inbox (`kind`, `title`, `body`, `metadata`, `read_at`) |

## Integrations

| Table | Purpose |
|-------|---------|
| `stripe_customers` | Maps `profiles` → Stripe customer id |

## Storage

- Bucket **`promos`** (private): object paths constrained by RLS; often `{user_uuid}/…`.

## Key database functions (non-exhaustive)

- `is_admin(uuid)` — stable admin check for policies.
- `dj_catalog_feed(...)` — DJ-visible catalog listing (vetting + visibility rules).
- `admin_apply_track_review(...)` — Atomic approve/reject + audit row.
- Analytics/dashboard RPCs (see `20260513120000_artist_analytics_dashboard.sql`).

## Indexes

Critical FK and lookup indexes are created in migrations; additional MVP indexes live in `20260518120000_mvp_performance_indexes.sql` (`djs.profile_id`, featured expiry helpers, play report listings).

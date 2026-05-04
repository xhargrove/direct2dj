# Row Level Security (RLS)

Supabase enables RLS on application tables. Policies evolve across migrations; this document captures **intent** and **patterns**. Always treat migrations as source of truth.

## Principles

1. **Authenticated users** operate as themselves (`auth.uid()`).
2. **Admins** bypass restrictions via `public.is_admin(auth.uid())` where policies allow.
3. **Artists** own rows through `tracks.artist_id` → `artists.profile_id = auth.uid()`.
4. **DJs** act through `djs.profile_id = auth.uid()` and **`current_dj_id()`** helpers where defined.
5. **Service role** (server secrets) bypasses RLS — only used in trusted server/webhook paths.

## Profiles & Stripe

- `profiles`: users read/update self (admin can assist per policies).
- `profiles` insert blocked for authenticated clients (trigger creates profile from auth users).
- `stripe_customers`: user reads own mapping.

## Artists & tracks

- Artists insert/update **their** tracks and related pack rows where migrations allow.
- Moderation/admin-only columns (`moderation_status`, `catalog_active`, `admin_tags`, etc.) protected by triggers/policies — artists cannot self-approve.

## DJs & catalog visibility

- Downloads/ratings/feedback/play reports: scoped so DJs only write where vetting + visibility functions allow (see `20260515120000_dj_vetting.sql` and related).
- `dj_catalog_feed` enforces approved DJ + catalog rules inside the RPC.

## Storage (`promos` bucket)

- Default pattern: objects live under path prefix `auth.uid()` for insert/select/update/delete **for own uploads**.
- Additional policy allows DJs to **select** objects referenced by **visible** `track_files` (catalog discovery/audio).

## Featured & payments

- Artists see **their** payments; admins manage all (`20260514120000_featured_placement_billing.sql`).
- Inserts for payments constrained to eligible tracks/plans.

## Admin review artifacts

- `featured_placements`, `admin_reviews`: scoped select for artists/DJs where applicable; writes largely admin.

## Notifications

- Users **select** and **update** only `notifications.user_id = auth.uid()`.
- **No client insert** policy — inserts via service role from application servers only.

## Play reports

- DJs insert/select own rows where vetting + track visibility hold.
- Artists may read reports for **their** tracks (policy joins).
- Admin may update (e.g. verification); DJs update own rows under vetting.

## Verification checklist

- Attempt forbidden actions **from the browser** with the anon key — expect Postgres policy errors.
- Confirm service keys never ship to client bundles.

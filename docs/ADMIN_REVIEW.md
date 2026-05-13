# Admin review system — Digital Service Pack

Canonical implementation lives in `app/admin/*`, `app/api/admin/sign-storage`, `lib/admin/*`, and Supabase migrations. **Do not** add parallel admin trees or a second sign-URL path. The app uses the **anon/publishable** Supabase client with the user session (RLS). **Do not** use the service role key in normal app flows.

**Related:** [`docs/FOUNDATION.md`](FOUNDATION.md) · [`docs/RLS_VERIFICATION.md`](RLS_VERIFICATION.md) · [`docs/SUPABASE_SMOKE_TESTS.md`](SUPABASE_SMOKE_TESTS.md)

---

## Admin route map

| Path | Purpose |
|------|---------|
| `/admin` | Redirects to `/admin/dashboard` |
| `/admin/dashboard` | Counts: pending submissions, tracks, live featured |
| `/admin/submissions` | Queue: `moderation_status = pending` and not draft |
| `/admin/submissions/[id]` | Full review UI for one track |
| `/admin/tracks` | All tracks (browse) |
| `/admin/tracks/[id]` | Same review UI as submissions detail |
| `/admin/artists` | Artist directory |
| `/admin/artists/[id]` | Artist profile + stats |
| `/admin/djs` | DJ directory |
| `/admin/featured` | Featured placements list + DJ-visible window |

**Access:** `app/admin/layout.tsx` calls `requireRoles(["admin"])`. Non-admins are redirected to their role home; unauthenticated users go to `/login`.

### Production: granting the first admin

The login UI **does not** set `profiles.role` on Vercel **Production** unless `ENABLE_LOGIN_ROLE_SELECTOR` is truthy (`true` / `1` / `yes`) and the project was **redeployed** after setting it (trusted hosts only; requires `SUPABASE_SERVICE_ROLE_KEY`). `next dev` and Vercel **Preview** enable the picker without that flag. By default, after sign-in the app reads **`profiles.role`** and routes to `/admin` only when that value is `admin`.

To promote a user (must already exist in `auth.users` with a `profiles` row), run in the **Supabase SQL editor** as a privileged role, substituting their `auth.users.id`:

```sql
update public.profiles
set role = 'admin'
where id = 'PASTE-USER-UUID-HERE';
```

Only existing admins can change roles through the app API (guard trigger); the SQL editor bypasses that for bootstrap.

**API:** `POST /api/admin/sign-storage` — signed URLs for pack previews (see [Storage preview security](#storage-preview-security)).

---

## Review state machine

States are `tracks.moderation_status`: `pending` | `approved` | `rejected`.

```mermaid
stateDiagram-v2
  [*] --> pending: Artist creates/submits
  pending --> approved: Admin approves
  pending --> rejected: Admin rejects (reason stored)
  rejected --> pending: Artist resubmits (pack complete)
  approved --> rejected: Admin rejects (rare; DB allows admin-only transition via trigger)
```

**Enforcement:**

1. **`tracks_enforce_moderation_rules`** — Non-admin inserts force `pending`. On update, only admins may change `moderation_status`, except the artist-owned transition **rejected → pending** (resubmit).
2. **`tracks_protect_admin_only_columns`** — For non-admins, preserves `moderation_status` unless that same allowed resubmit applies; also preserves `rejection_reason`, `catalog_active`, and `admin_tags`.

Together, artists cannot self-approve or set arbitrary moderation states.

---

## Admin-only track fields

Only admins (or controlled DB functions) may change:

| Column | Notes |
|--------|--------|
| `moderation_status` | Approve/reject via `admin_apply_track_review` RPC (atomic with audit row) or preserved by protect trigger for non-admins |
| `rejection_reason` | Set on reject; cleared on approve; stripped by protect trigger for artists |
| `catalog_active` | `false` hides the track from the DJ catalog even when approved |
| `admin_tags` | Curated labels; stripped by protect trigger for artists |

Artists may edit normal metadata (title, genre, files, etc.) per existing RLS.

---

## `catalog_active` behavior

`track_is_visible_to_dj(track_id)` requires:

- `tracks.moderation_status = approved`
- `tracks.catalog_active = true`
- `artists.status = active`

So **approved but hidden** tracks do not appear to DJs for discovery, downloads, ratings, etc.

---

## `rejection_reason` visibility

- Stored on `tracks.rejection_reason` when status is `rejected`.
- Cleared when an admin approves.
- Shown on admin track review pages and relevant artist flows where the app surfaces rejection copy.

---

## Storage preview security

`POST /api/admin/sign-storage`

1. **Authentication & role:** `getAdminContext()` — must be signed in with `profiles.role = admin`. Returns 403 otherwise.
2. **Bucket:** Only `promos` is allowed. Requests may omit `bucket` (defaults to `promos`) or send `"bucket": "promos"`; any other value returns 400.
3. **Path:** Non-empty, no `..`, no leading `/`, length bounded; must match **`track_files.storage_path`** for at least one row (otherwise 404). This blocks arbitrary object signing even for admins.
4. **TTL:** Signed URLs are short-lived (1 hour).

Storage RLS still includes `promos_select_admin` for admins; the API adds application-layer registration checks.

---

## Featured placement visibility (DJs)

From migration `20260510120000_admin_review_hardening.sql`, DJs may **SELECT** a `featured_placements` row only when all hold:

- `moderation_status = 'approved'`
- `(starts_at IS NULL OR starts_at <= now())`
- `(ends_at IS NULL OR ends_at >= now())`
- And the parent track passes `track_is_visible_to_dj(track_id)` (approved + catalog active + active artist)

**NULL semantics:**

- **`starts_at` NULL** — treat as “effective immediately” (no future start gate).
- **`ends_at` NULL** — **open-ended** (no automatic expiry until a date is set). No `NOT NULL` constraint is enforced so admins can run evergreen placements.

**Inclusive end:** `ends_at >= now()` so the placement is still visible at the exact `ends_at` timestamp (align admin UI “live” badges with the same rule).

---

## `admin_reviews` audit

- **Insert:** Admins only; `reviewer_id` must equal `auth.uid()` (RLS `with check`).
- **Atomic approve/reject:** `public.admin_apply_track_review(...)` updates `tracks` and inserts one `admin_reviews` row in a **single transaction** (`SECURITY DEFINER`, gated by `is_admin(auth.uid())`). Not a service-role key from the client.
- **Append-only:** RLS **UPDATE** and **DELETE** policies on `admin_reviews` for authenticated users were **removed** so audit rows cannot be edited or deleted through normal API clients. **Break-glass:** maintenance uses Supabase SQL editor / privileged role.

**Why UPDATE/DELETE were removed:** Prevent tampering with audit history. Previous policies allowed admins to rewrite history.

---

## Manual smoke checklist

After deploying migrations (`npm run db:push` or CI):

1. **Role gate:** Log in as DJ or artist; visit `/admin/*` → redirected away from admin.
2. **Admin:** Open `/admin/submissions`; open a pending track; confirm audio/preview loads (sign-storage 200 only for paths present in `track_files`).
3. **Approve:** Track becomes `approved`; new `admin_reviews` row with `decision = approved`, `reviewer_id` = your user.
4. **Reject:** Requires reason; track `rejected`, reason saved; `admin_reviews` row with notes.
5. **Artist resubmit:** As artist, move rejected → pending where allowed; confirm still blocked from setting `approved`.
6. **Catalog hide:** Toggle catalog inactive; confirm DJ cannot see interact where visibility depends on `track_is_visible_to_dj`.
7. **Featured:** Create placement with start/end; confirm DJ-facing policy matches window (use SQL or DJ UI when available).
8. **Append-only:** As admin, attempt `UPDATE` / `DELETE` on `admin_reviews` via PostgREST or SQL with anon key → expect denial for authenticated role policies (no update/delete).

---

## Migrations reference

| Migration | Topic |
|-----------|--------|
| `20260505120000_enforce_catalog_and_storage_rules.sql` | `tracks_enforce_moderation_rules` |
| `20260507140000_tracks_allow_resubmit_rejected.sql` | Artist rejected → pending |
| `20260509120000_admin_review_catalog.sql` | `catalog_active`, `admin_tags`, `rejection_reason`, featured DJ policy |
| `20260510120000_admin_review_hardening.sql` | Protect trigger + moderation; featured `ends_at >= now()`; append-only reviews; `admin_apply_track_review`; `track_files.storage_path` index |

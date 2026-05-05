# RLS verification — Digital Service Pack domain schema

This document maps **intended access rules** to **implemented enforcement** (RLS policies + `SECURITY DEFINER` helpers + triggers). It does not replace SQL migrations; it is the human-readable audit trail.

**Authority:** `supabase/migrations/*.sql`  
**Admin primitive:** `public.is_admin(auth.uid())` only — defined in `20260503120000_init_direct2dj.sql` (reads `profiles.role = 'admin'` inside `SECURITY DEFINER`). No duplicated admin logic outside policies except role-change guard (`profiles_guard_role_change`) which calls `is_admin(auth.uid())`.

**Application rules:** Use existing clients in `lib/supabase/client.ts` and `lib/supabase/server.ts` only. Never use the service role key in the browser or in normal request handlers.

---

## Shared helpers (database)

| Function | Purpose |
|----------|---------|
| `public.is_admin(uid uuid)` | True if `profiles.role = 'admin'` for that user id. |
| `public.current_artist_id()` | Current user’s `artists.id` (if any). |
| `public.current_dj_id()` | Current user’s `djs.id` (if any). |
| `public.artist_owns_track(track_id, profile_id)` | Ownership via `tracks → artists → profiles`. |
| `public.track_is_visible_to_dj(track_id)` | `tracks.moderation_status = approved` AND `tracks.catalog_active = true` AND `artists.status = active` (see `20260509120000_admin_review_catalog.sql`). |

**Triggers (catalog hardening):** `20260505120000_enforce_catalog_and_storage_rules.sql`

- `tracks_enforce_moderation_rules`: non-admin inserts force `moderation_status = pending`; only admins may change `moderation_status` on update, except the artist-owned **rejected → pending** resubmit (`20260507140000_tracks_allow_resubmit_rejected.sql`). If `auth.uid()` is null (e.g. database owner seed / service role path), end-user rules are skipped — see **Operational risks**.

- `tracks_protect_admin_only_columns` (`20260510120000_admin_review_hardening.sql`): non-admins cannot change `rejection_reason`, `catalog_active`, `admin_tags`, or `moderation_status` except the same allowed **rejected → pending** resubmit (defense in depth).

- `track_files_enforce_storage_path_prefix`: non-admin rows must use `storage_path` prefix `{auth.uid()}/`. Skipped when `auth.uid()` is null or user is admin.

---

## Table-by-table rules

### `artists`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Authenticated | All rows (`using (true)`) | Own `profile_id = auth.uid()` and `profiles.role = artist` | Own or admin | Admin only |

**Notes:** Open read allows DJs to resolve artist display data on approved tracks. Writes are scoped to own row or admin.

---

### `djs`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Authenticated | All rows | Own `profile_id = auth.uid()` and `profiles.role = dj` | Own or admin | Admin only |

---

### `tracks`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Admin | All | Via policy + moderation trigger | Yes | Yes |
| Artist (owner) | Own rows | `artist_id = current_artist_id()` | Own rows (cannot change `moderation_status` except via trigger denial) | Own rows |
| Artist (other) | No | No | No | No |
| DJ | Rows passing `track_is_visible_to_dj(id)` only | No | No | No |

**Moderation:** Only admins change `moderation_status` (RLS allows owner update, but trigger rejects moderation delta for non-admins). Non-admin inserts are forced to `pending`.

---

### `track_files`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Admin | All | Yes | Yes | Yes |
| Artist (track owner) | Own track’s files | Own track; path prefix enforced | Own track | Own track |
| DJ | Files for tracks visible via `track_is_visible_to_dj(track_id)` | No | No | No |

**Storage path:** Non-admins must use paths under `{auth.uid()}/` (aligns with `promos` bucket layout).

---

### `downloads`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Admin | All | N/A | Yes | Yes |
| DJ | Own `dj_id` | `dj_id = current_dj_id()` AND `track_is_visible_to_dj(track_id)` | Own / scoped | No |
| Artist (owner) | Rows for own tracks | No | Scoped to own tracks | No |

**Note:** Insert requires visible track (approved + active artist) — unapproved or inactive-artist tracks fail visibility check.

---

### `ratings`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Admin | All | With DJ check | Yes | Yes |
| DJ | Own ratings + visible-track aggregate context per policy | `dj_id = current_dj_id()` AND `track_is_visible_to_dj(track_id)` | Own | Own |
| Artist | Ratings on own tracks | No | No | No |

**Duplicate prevention:** `unique (track_id, dj_id)` + check `score between 1 and 5` (`ratings_score_range`).

---

### `feedback`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Admin | All | N/A | Yes | Yes |
| DJ | Own rows; others’ on visible tracks if `moderation_status = approved` for feedback | `dj_id = current_dj_id()` AND `track_is_visible_to_dj(track_id)` | Own / artist owner / admin | No |
| Artist | Feedback on own tracks | No | Own-track scope | No |

**Hidden tracks:** Inserts require `track_is_visible_to_dj` — pending/unapproved tracks block DJ feedback.

---

### `featured_placements`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Admin | All | Yes (`with check (is_admin)`) | Yes | Yes |
| Artist | Placements for own tracks | No | No | No |
| DJ | Approved placements for visible tracks per policy | No | No | No |

---

### `play_reports`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Admin | All | N/A | Yes | Yes |
| DJ | Own + visible scope | `dj_id = current_dj_id()` AND `track_is_visible_to_dj(track_id)` | Own / scoped | No |
| Artist | Reports for own tracks | No | Scoped | No |

---

### `admin_reviews`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Admin | All | `reviewer_id = auth.uid()` required on insert | **No** | **No** |
| Artist (track owner) | Reviews for own tracks | No | No | No |
| DJ | No | No | No | No |

**Append-only (`20260510120000_admin_review_hardening.sql`):** UPDATE and DELETE policies for authenticated roles were dropped so audit rows cannot be altered via PostgREST. Atomic approve/reject uses `public.admin_apply_track_review(...)` (`SECURITY DEFINER`, admin-only guard inside function).

---

## Operational risks (not weakened here; documented for ops)

1. **`auth.uid()` null in triggers:** `tracks_enforce_moderation_rules` and `track_files_enforce_storage_path_prefix` skip checks when `auth.uid()` is null. Sessions using the **service role** key or raw SQL as superuser can bypass end-user rules. **Mitigation:** Never expose `SUPABASE_SERVICE_ROLE_KEY` to clients; use it only in secured server jobs if needed.

2. **Storage bucket vs `track_files`:** RLS protects table rows; bucket policies (`promos`) enforce object prefix. Keep bucket policies aligned with `track_files` paths.

3. **Views:** No security-invoker views added; if you add views later, follow Postgres 15+ `security_invoker` guidance.

---

## Migration review checklist (Phase 1)

| Item | Status | Evidence |
|------|--------|----------|
| Score 1–5 | OK | `ratings_score_range` on `public.ratings` |
| `moderation_status` not changeable by artists/DJs | OK | `tracks_enforce_moderation_rules` + `tracks_protect_admin_only_columns` + RLS ownership |
| `updated_at` on update | OK | `handle_updated_at` triggers on listed tables |
| Role extension trigger idempotent | OK | `sync_profile_role_extensions` uses `where not exists (...)` |
| Admin checks use `public.is_admin(auth.uid())` in policies | OK | Grep migrations; `is_admin` reads `profiles.role` only |
| No service-role bypass in app tier | OK | App uses anon/publishable key only in clients |
| Profile role changes under seed / maintenance | OK | `20260506100000_profiles_role_guard_maintenance.sql`: guard blocks role changes only when `auth.uid()` is not null and caller is not admin (authenticated users unchanged) |

---

## Related docs

- `docs/SUPABASE_SMOKE_TESTS.md` — manual QA steps  
- `docs/FOUNDATION.md` — schema overview  
- `supabase/seed.sql` — local fixture data (test emails only)

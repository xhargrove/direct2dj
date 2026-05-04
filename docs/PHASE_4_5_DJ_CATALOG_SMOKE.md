# Phase 4.5 — DJ catalog manual smoke validation

**Scope:** `DJ feed → track detail → preview → pack download → rating → feedback` for **approved** DJs, plus negative cases for other roles and hidden tracks.

**How to use:** Run each row in a dev or staging project with known seed or test data. For every row, fill **Actual result**, **Status**, and **Notes** when you run it.

**Automation:** `npm test` runs unit tests for `lib/dj/catalog-validation` only. It does **not** replace this checklist.

## Phase 4.5 gate status

**Verdict: PARTIAL — healthy (not GO).**

Lint, typecheck, build, and unit tests passed. Feedback uniqueness was hardened (migrations + review), and DJ catalog authorization was reviewed.

**Seed / Auth environment:** `supabase/seed.sql` now defines **deterministic Phase 4.5 smoke users** (`smoke-*@example.com`, shared **local-only** password documented in that file and `docs/SUPABASE_SMOKE_TESTS.md`). **`npm run smoke:accounts`** (after **`npm run db:reset`**) validates rows. **Point `.env.local` at the same database** you reset (local URL + anon key from **`npm run db:status`** when using Docker). If `/login` still does not redirect after a good reset, see **Troubleshooting (sign-in stays on /login)** below.

**2026-05-04 (historical):** First automated smoke attempt failed because **remote** `.env.local` had **no** matching Auth users and **Docker was unavailable** — see **Smoke run log (2026-05-04)**.

**Phase 4.5 is not GO** until sections **A–D** and **F–H** are executed in a **real browser** with passing rows.

**Phase 5** may proceed under explicit risk acceptance, or after completing authenticated smoke.

**Do not mark Phase 4.5 GO from logged-out `curl` checks alone.**

---

## Environment setup for authenticated smoke

### Local (recommended)

1. Start **Docker Desktop**.
2. From repo root: **`npm run db:start`** then **`npm run db:reset`** (uses `npx supabase`; applies migrations + `seed.sql`). Do **not** rely on a globally installed `supabase` binary unless it is on your `PATH`.
3. Copy API URL and **anon** key: **`npm run db:status`** (or `npx supabase status`) — use **Publishable** / anon key from **Project API** section.
4. Set `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to **that local** project (defaults often `http://127.0.0.1:54321`).
5. `npm install` (once), then `npm run dev`.
6. Confirm fixtures: `npm run smoke:accounts` (expects local DB running).
7. Sign in at `/login` with each **smoke account** (see `docs/SUPABASE_SMOKE_TESTS.md`; password is **local smoke only** — never use in production).

### Remote / staging

1. Apply all migrations (`supabase db push` or CI pipeline).
2. In Supabase **Authentication → Users**, create users matching **emails** in `seed.sql` (or invite + set passwords). **Confirm emails** if your project requires confirmation for password login.
3. Run equivalent SQL (as postgres / dashboard SQL) to insert **`profiles`**, **`djs`** with correct **`vetting_status`**, **`artists`**, **`tracks`**, **`track_files`**, and **`storage.objects`** — **or** run a **sanitized** subset of `seed.sql` against staging **only** with ops approval (never against production).
4. Ensure **Storage** bucket **`promos`** exists and objects exist for paths referenced by **`track_files`** if testing preview/signing.
5. Run the smoke matrix in the browser.

### Troubleshooting (sign-in stays on `/login`)

Verify in order: Auth user **exists**; **email confirmed** (`email_confirmed_at` or dashboard equivalent); **password** matches; **`profiles`** row exists for that user id; **`role`** is correct; for DJs, **`djs`** row exists and **`vetting_status`** matches scenario; **`.env.local`** points to the project where those users live (not a different Supabase ref).

### Catalog fixture IDs (after local `db reset`)

| Track UUID | Purpose |
|------------|---------|
| `f2000001-0000-4000-8000-000000000001` | Pending moderation (not DJ-visible) |
| `f2000002-0000-4000-8000-000000000002` | Approved + catalog + pack files (**happy path**) |
| `f2000003-0000-4000-8000-000000000003` | Approved, `catalog_active = false` |
| `f2000004-0000-4000-8000-000000000004` | Rejected |
| `f2000005-0000-4000-8000-000000000005` | Approved on **inactive** artist |
| `f2000006-0000-4000-8000-000000000006` | Approved, visible, **no** `track_files` (edge) |

---

## Quick start

### 1. Prerequisites

- App running locally (`npm run dev`) or a **staging URL** available.
- Supabase project has **Phase 4 / 4.5 migrations** applied.
- **Test accounts** prepared (see **`supabase/seed.sql`** + **`docs/SUPABASE_SMOKE_TESTS.md`** when using local reset):
  - approved DJ
  - pending DJ
  - suspended DJ
  - artist
  - admin
- At least one **approved, catalog-visible** track with eligible files (preview / pack).
- At least one **hidden, deactivated, or non-visible** track for negative testing.

### 2. Recommended smoke order

1. **E:** Logged-out checks  
2. **B / C:** Pending and suspended DJ blocked checks  
3. **D / F:** Cross-role checks  
4. **A:** Approved DJ happy path  
5. **G:** Catalog visibility matrix  
6. **H:** Failure / edge cases  

### 3. Instructions

For **every** row, when you run it, fill:

- **Actual result** — what happened (short, factual).  
- **Status** — **`Pass`** or **`Fail`** when fully executed in the browser (or **`Partial`** only when explicitly documented, e.g. route-guard check via `curl`, not a full click-through).  
- **Notes** — issues, env quirks, ticket links, or explanation of **Partial**.

Leave **Actual result** empty and **Status** as **`Pending`** until that row is actually executed. Do not bulk-mark Pass without running the steps.

---

## Smoke run log (2026-05-04)

| Field | Detail |
|--------|--------|
| **Environment** | Next.js dev server `http://127.0.0.1:3000`; Supabase from `.env.local` (not restarted here). |
| **Automation** | Playwright (Chromium): sign-in flow with seed emails/password from `supabase/seed.sql` + docs; section **E** unchanged (prior `curl`). |
| **Blocker (stop)** | **Scenario:** All authenticated smoke groups that require sign-in. **Account types:** approved DJ, artist, admin (seed). **Route/action:** `POST` via `/login` form (`signInWithPassword`). **Expected:** Redirect off `/login` to role home (`/artist`, `/dj/dashboard`, `/admin`, etc.). **Actual:** URL stayed **`/login`** after submit (timeout waiting for navigation); no `[role=alert]` text captured in the snapshot. **Likely cause:** Seed users **do not exist** in the Supabase Auth database pointed to by `.env.local`, or **email confirmation** / auth settings block password login, or password mismatch vs remote project. **Recommended fix:** Start **Docker**, run **`npm run db:reset`** locally so `seed.sql` creates users; **or** create matching users in the remote Supabase project; **or** run smoke against **staging** with known passwords. Re-run Playwright or manual browser matrix. |
| **Extra (resolved in repo):** `seed.sql` now includes **pending** and **suspended** DJ smoke users (`smoke-pending-dj@`, `smoke-suspended-dj@`). Re-run smoke after **`npm run db:reset`** and `.env.local` aligned to local Supabase. |

---

## Column definitions

| Column | What to write |
|--------|----------------|
| **Actual result** | What happened when you ran the steps (short, factual). Example: “Feed loaded; 3 tracks shown” or “Redirected to /login”. |
| **Status** | `Pending` until run. Then **`Pass`** if behavior matched **Expected result**, **`Fail`** if not, or **`Partial`** when only a documented subset was verified (see **Notes**). |
| **Notes** | Any issue, mismatch detail, screenshot link, env quirk, or follow-up ticket. Leave blank if none. |

| Status value | Meaning |
|--------------|---------|
| Pending | Not run yet |
| Pass | Observed behavior matches **Expected result** |
| Fail | Does not match; explain in **Notes** |
| Partial | Subset only (e.g. `curl` route guard); **Notes** must say what was and was not verified |

---

## A. Approved DJ — happy path

| Scenario | Account type | Steps | Expected result | Actual result | Status | Notes |
|----------|--------------|-------|-----------------|---------------|--------|-------|
| Open feed | Approved DJ, signed in | Open `/dj/feed` | Page loads; “Discover” with filters; no error banner about missing migration | | Pending | 2026-05-04: Not executed — seed DJ sign-in did not complete (see Smoke run log). |
| See catalog rows | Same | Scroll list + featured (if any) | Rows show title, artist line, genre, BPM, explicit, cover or placeholder; links to `/dj/tracks/[id]` | | Pending | Same |
| Search / filter | Same | Set search `q`, genre, BPM, explicit, sort, paginate | List updates; empty state says “No tracks match” when filters exclude all; without filters and empty DB says no approved tracks yet | | Pending | Same |
| Open track detail | Same | Click a track card | `/dj/tracks/{id}` loads; metadata, preview section, pack download, rating, feedback | | Pending | Same |
| Preview | Same | Wait for preview (or use preview area) | Audio element plays signed preview URL; no raw storage path shown | | Pending | Same |
| Download pack | Same | Click “Download DJ pack” | Download row inserted; signed links listed; no paths leaked | | Pending | Same |
| Submit rating | Same | Pick stars 1–5, optional fields, Save | Success message; refresh persists rating | | Pending | Same |
| Edit rating | Same | Change stars/save again | Still one rating row (upsert); message ok | | Pending | Same |
| Submit feedback | Same | Enter ≥3 chars, Send | Success; moderation pending if new | | Pending | Same |
| Edit feedback | Same | Change text, Send again | Same row updated; status line still accurate | | Pending | Same |
| Refresh persistence | Same | Full page reload | Rating + feedback text match saved values | | Pending | Same |

---

## B. Pending DJ — blocked catalog

| Scenario | Account type | Steps | Expected result | Actual result | Status | Notes |
|----------|--------------|-------|-----------------|---------------|--------|-------|
| Feed redirect | Pending DJ | Open `/dj/feed` | Redirect to `/dj/application-status` (middleware) | | Pending | 2026-05-04: Not executed — auth blocker; default seed has no pending-vetting DJ user (see Smoke run log). |
| Direct track URL | Pending DJ | Open `/dj/tracks/{valid-uuid}` | Redirect away from catalog route | | Pending | Same |
| Forged `submitRating` | Pending DJ | Trigger rating from UI if reachable or devtools | Error from `getApprovedDjCatalogContext` (pending message) or redirect prevents UI | | Pending | Same |
| Forged `submitFeedback` | Pending DJ | Same | Same | | Pending | Same |
| Forged `prepareDjPackDownload` | Pending DJ | Same | Same | | Pending | Same |

---

## C. Suspended DJ

| Scenario | Account type | Steps | Expected result | Actual result | Status | Notes |
|----------|--------------|-------|-----------------|---------------|--------|-------|
| Feed blocked | Suspended | Open `/dj/feed` | Redirect (typically to application-status); catalog not usable | | Pending | 2026-05-04: Not executed — auth blocker; no suspended DJ fixture in default seed (see Smoke run log). |
| Actions blocked | Suspended | Any catalog server action | `{ error }` with suspended copy | | Pending | Same |

---

## D. Artist account

| Scenario | Account type | Steps | Expected result | Actual result | Status | Notes |
|----------|--------------|-------|-----------------|---------------|--------|-------|
| DJ feed | Artist | Open `/dj/feed` | Redirect to artist dashboard (`requireRoles` / routing) | | Pending | 2026-05-04: Not executed — `artist.seed@` sign-in did not complete (see Smoke run log). |
| Forged DJ action | Artist | Call server action as artist session | “DJ accounts only” or similar from `getDjContext` | | Pending | Same |

---

## E. Unauthenticated

| Scenario | Account type | Steps | Expected result | Actual result | Status | Notes |
|----------|--------------|-------|-----------------|---------------|--------|-------|
| Feed | Logged out | GET `/dj/feed` | Redirect to login | `GET /dj/feed` returned 307 redirect to `/login` | Partial | Verified by `curl` against local dev server, not a full browser click-through. Acceptable as a logged-out route-guard check, but not counted as full manual browser smoke. |
| Track detail | Logged out | GET `/dj/tracks/{id}` | notFound or redirect per app | `GET /dj/tracks/00000000-0000-4000-8000-000000000001` returned 307 redirect to `/login` | Partial | Verified by `curl` against local dev server, not a full browser click-through. Acceptable as a logged-out route-guard check, but not counted as full manual browser smoke. |

---

## F. Admin

| Scenario | Account type | Steps | Expected result | Actual result | Status | Notes |
|----------|--------------|-------|-----------------|---------------|--------|-------|
| Admin surfaces | Admin | Open `/admin/submissions`, `/admin/tracks`, DJ apps | Pages load; Phase 4.5 did not remove admin flows | | Pending | 2026-05-04: Not executed — `admin.seed@` sign-in did not complete (see Smoke run log). |

---

## G. Catalog visibility matrix

| Scenario | Account type | Steps | Expected result | Actual result | Status | Notes |
|----------|--------------|-------|-----------------|---------------|--------|-------|
| Approved + catalog_active | Approved DJ | Track approved, `catalog_active=true`, visible in RPC | Appears in feed when RPC rules match | | Pending | 2026-05-04: Not executed — approved DJ session unavailable (see Smoke run log). |
| Approved + catalog inactive | Approved DJ | Same track `catalog_active=false` | Not in `dj_catalog_feed` / not selectable | | Pending | Same |
| Pending moderation | Approved DJ | Artist track `moderation_status=pending` | Not DJ-visible | | Pending | Same |
| Rejected track | Approved DJ | `moderation_status=rejected` | Not in feed | | Pending | Same |
| No pack files | Approved DJ | Visible track but empty `track_files` | Detail: pack download error “No files in this pack”; preview may fail | | Pending | Same |

---

## H. Failure / edge cases

| Scenario | Account type | Steps | Expected result | Actual result | Status | Notes |
|----------|--------------|-------|-----------------|---------------|--------|-------|
| Missing track ID | Approved DJ | `/dj/tracks/` invalid | 404 | | Pending | 2026-05-04: Not executed — approved DJ session unavailable (see Smoke run log). |
| Invalid UUID | Approved DJ | `/dj/tracks/not-a-uuid` | 404 | | Pending | Same |
| Hidden track ID | Approved DJ | UUID of draft/non-catalog track | notFound or empty track fetch | | Pending | Same |
| Preview no audio | Approved DJ | Track with no audio-like files | Message: no preview audio | | Pending | Same |
| Storage signing failure | Approved DJ | Simulate broken storage config | User-visible error string; no silent success | | Pending | Same |
| Download insert fails | Approved DJ | RLS error / constraint | Error returned; **note:** if insert succeeds then signing fails mid-loop, download row may exist without all URLs — known limitation | | Pending | Same |
| Rating invalid | Approved DJ | Score 0 or 6 | Validation error | | Pending | Covered partially by `npm test`; browser row not run (auth). |
| Feedback too short | Approved DJ | 1–2 chars | Validation error | | Pending | Unit tests; browser row not run (auth). |
| Feedback too long | Approved DJ | >8000 chars | Validation error | | Pending | Unit tests; browser row not run (auth). |

---

## Post-run

- Attach failures to tickets with **track id**, **DJ vetting status**, and **browser/network** notes.
- Re-run after any change to `middleware.ts`, `lib/dj/context.ts`, `app/dj/actions.ts`, or catalog RLS migrations.

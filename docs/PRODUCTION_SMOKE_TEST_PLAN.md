# Production smoke test plan

Execute after deploy to **production** (or production-like Preview with production env). Check each box; **do not** mark GO if any critical check fails.

## 0. Preflight

- [ ] Vercel env set per `docs/ENV_DEPLOYMENT_CHECKLIST.md`
- [ ] `npm run db:push` (or equivalent) applied to **this** Supabase project
- [ ] Stripe webhook URL and events per `docs/STRIPE_DEPLOYMENT_CHECKLIST.md`

## 1. Public / static behavior

- [ ] **Home** `/` loads **without** RSC digest error; **Spotlight hub** section renders (or hides when empty)
- [ ] **`/featured`** loads **logged out** — spotlight hub sections or empty state, not 500
- [ ] **`/login`** loads

## 2. Dev route safety

- [ ] `GET /api/dev/supabase-auth` → **404** on production
- [ ] `POST /api/dev/supabase-auth` → **404** on production

## 3. Artist

- [ ] Sign in as artist
- [ ] **New DJ pack** → Stripe checkout (test card in test mode) → return URL → draft opens or billing shows payment
- [ ] Webhook delivery **200** in Stripe Dashboard for checkout session

### 3b. Paid submission path (reliability)

- [ ] **Backstage → System** (`/admin/system`): `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SITE_URL` show **OK** (or expected warn only for optional cron/email)
- [ ] Complete checkout → lands on `/artist/tracks/new/complete?session_id=…` **or** Billing shows **Continue upload**
- [ ] Artist dashboard shows **Payment received — finish your upload** (or draft banner with Continue upload)
- [ ] Upload at least one pack file on draft edit → **Submit for review**
- [ ] **Backstage → Submissions → Pending submissions** lists the track (non-draft)
- [ ] **Backstage → Submissions → Paid — awaiting upload** does **not** still list that track after submit
- [ ] (Optional) Artist receives in-app notification / email when provider configured

## 4. DJ

- [ ] Sign in as approved DJ (or complete apply flow per product)
- [ ] **`/dj/feed`** loads; **Spotlight hub** at top on page 1 when editorial, Featured Spotlight, or leaderboard data exists
- [ ] Open a track → save **feedback** + **rating** (stars, club ready, radio ready)
- [ ] **Download DJ pack** → single **ZIP** with all pack files (not one file / not cover-only)
- [ ] ZIP filenames readable (`Artist - Title (Clean).mp3`, etc.)

## 4b. Spotlight hub (public + editorial)

- [ ] Admin assigns **Record of the Week** at `/admin/spotlights`
- [ ] **Home** `/` shows assigned editorial content (or hub hidden when empty — no 500)
- [ ] **`/featured`** logged out shows hub or empty state
- [ ] **Featured Spotlight** (paid) appears in separate row from editorial slots
- [ ] Trending / Most Downloaded / Most Feedback hidden until ≥3 qualifying tracks
- [ ] Track without cover art still renders (placeholder)

## 5. Admin

- [ ] Sign in as admin
- [ ] **`/admin/tracks`** → open a track review
- [ ] **New track (no fee)** → creates draft → lands on admin track page
- [ ] **`/admin/submissions`** — **Paid — awaiting upload** and **Pending submissions** sections load
- [ ] **`/admin/payments`** — reconciliation table loads (no service-role error)
- [ ] **`/admin/spotlights`** — assign Record of the Week / DJ Pick; live preview loads
- [ ] **`/admin/system`** — health checks visible

## 6. Storage / covers

- [ ] At least one track shows **cover** image when file exists, or placeholder when not
- [ ] If covers broken, Vercel logs show `[cover-sign]` warnings — investigate RLS/policies per `docs/STORAGE_DEPLOYMENT_CHECKLIST.md`

## 7. Optional integrations

- [ ] If using cron: `GET /api/cron/notifications` with `Authorization: Bearer <CRON_SECRET>` → **200**
- [ ] If using DJ Monitor Pro: POST with secret → **200**

## 8. Logs

- [ ] Vercel → Functions / logs: no unhandled RSC errors during smoke

## Sign-off

| Result | Condition |
|--------|-----------|
| **PASS** | All **critical** checks (sections 1–5, 8) pass |
| **FAIL** | Any 500 on core routes or webhook never delivers |

After PASS, mark production **GO** in [LAUNCH_VERIFIED.md](./LAUNCH_VERIFIED.md).

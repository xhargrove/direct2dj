# Production smoke test plan

Execute after deploy to **production** (or production-like Preview with production env). Check each box; **do not** mark GO if any critical check fails.

## 0. Preflight

- [ ] Vercel env set per `docs/ENV_DEPLOYMENT_CHECKLIST.md`
- [ ] `npm run db:push` (or equivalent) applied to **this** Supabase project
- [ ] Stripe webhook URL and events per `docs/STRIPE_DEPLOYMENT_CHECKLIST.md`

## 1. Public / static behavior

- [ ] **Home** `/` loads **without** RSC digest error (browser + Vercel logs)
- [ ] **`/featured`** loads **logged out** (list or empty state, not 500)
- [ ] **`/login`** loads

## 2. Dev route safety

- [ ] `GET /api/dev/supabase-auth` → **404** on production
- [ ] `POST /api/dev/supabase-auth` → **404** on production

## 3. Artist

- [ ] Sign in as artist
- [ ] **New DJ pack** → Stripe checkout (test card in test mode) → return URL → draft opens or billing shows payment
- [ ] Webhook delivery **200** in Stripe Dashboard for checkout session

## 4. DJ

- [ ] Sign in as approved DJ (or complete apply flow per product)
- [ ] **`/dj/feed`** loads
- [ ] **Featured** section shows when placements exist

## 5. Admin

- [ ] Sign in as admin
- [ ] **`/admin/tracks`** → open a track review
- [ ] **New track (no fee)** → creates draft → lands on admin track page

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

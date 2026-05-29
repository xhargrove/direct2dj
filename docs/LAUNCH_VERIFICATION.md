# Launch Verification — Digital Service Pack

**Phase:** Production readiness gate before public launch.  
**Not in scope:** redesign, new features, architecture rewrites.

**Related:** [PRODUCTION_SMOKE_TEST_PLAN.md](./PRODUCTION_SMOKE_TEST_PLAN.md) · [ENV_DEPLOYMENT_CHECKLIST.md](./ENV_DEPLOYMENT_CHECKLIST.md) · [LAUNCH_VERIFIED.md](./LAUNCH_VERIFIED.md) · [STRIPE_DEPLOYMENT_CHECKLIST.md](./STRIPE_DEPLOYMENT_CHECKLIST.md)

---

## GO / NO-GO summary (fill at sign-off)

| Gate | Status | Owner | Date |
|------|--------|-------|------|
| Phase 1 — Environment safety | ☐ Pass ☐ Fail | | |
| Phase 2 — Production migrations | ☐ Pass ☐ Fail | | |
| Phase 3 — Production smoke tests | ☐ Pass ☐ Fail | | |
| Phase 4 — Featured Spotlight content | ☐ Pass ☐ Fail | | |
| Phase 5 — Stripe safety | ☐ Pass ☐ Fail | | |
| **LAUNCH DECISION** | ☐ **GO** ☐ **NO-GO** | | |

**NO-GO blockers:** _list any failed critical checks_

---

## Phase 1 — Environment safety audit

### Automated (run from repo root)

```bash
# Local dev — must use Stripe TEST keys (fails if sk_live_ in .env.local)
npm run verify:launch-env

# All pre-deploy env + Stripe + App Store checks (alias)
npm run verify

# Stripe API + mode (loads .env.local)
npm run verify:stripe
npm run verify:stripe-webhooks

# App Store / Capacitor HTTPS
npm run verify:app-store

# Code gate before deploy
npm run verify:launch
```

### Stripe mode rules

| Environment | `STRIPE_SECRET_KEY` | `NEXT_PUBLIC_SITE_URL` | Real charges? |
|-------------|---------------------|------------------------|---------------|
| **Local dev / smoke** | `sk_test_…` / `pk_test_…` | `http://localhost:3000` | **No** — use test card `4242…` |
| **Local + production stack** | Live keys only if intentional | `http://localhost:3000` | **Yes** — set `LAUNCH_ALLOW_LIVE_STRIPE_LOCAL=1` in `.env.local` |
| **Production (Vercel)** | `sk_live_…` / `pk_live_…` | `https://digitalservicepack.com` | **Yes** — only after intentional launch approval |
| **Unsafe** | Live keys without opt-in flag locally | — | **Never** — `npm run verify` fails until fixed |

**Runtime visibility (no secrets exposed):**

- `GET /api/health` → `{ ok, stripeMode, siteHost }` (public liveness + mode label)
- **Backstage → System** (`/admin/system`) → full env health for operators

### Required environment variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Auth + RLS client |
| `NEXT_PUBLIC_SITE_URL` | Public | Stripe return URLs, auth redirects |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Checkout (must match secret mode) |
| `STRIPE_SECRET_KEY` | Server | Checkout sessions, webhook retrieve |
| `STRIPE_WEBHOOK_SECRET` | Server | `POST /api/webhooks/stripe` signature |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Post-payment draft creation, notifications, cover signing |

See [.env.example](../.env.example) and [ENVIRONMENT.md](../ENVIRONMENT.md).

### Storage assumptions

- Bucket: **`promos`** (private)
- Artist uploads: path `{auth.uid()}/tracks/{trackId}/…` — RLS `promos_insert_own_prefix`
- Admin on behalf of artist: signed upload API (requires service role)

### Auth / redirect assumptions

- Site URL + `/auth/callback` in Supabase Auth → URL configuration
- Password reset + email confirm use same callback

### Known non-blockers (monitor only)

- No automated E2E for full artist upload path — manual smoke required
- Slot replace deletes old file before new upload completes
- MIME validation primarily client-side
- Legacy `create_draft_track` RPC exists; UI is pay-first

---

## Phase 2 — Production migrations

Apply to **production Supabase** (not local):

```bash
npm run db:link    # once per machine
npm run db:push
npx supabase migration list
```

**Parity checklist:** [SUPABASE_MIGRATION_PARITY_CHECKLIST.md](./SUPABASE_MIGRATION_PARITY_CHECKLIST.md)

**Critical RPCs** (run in SQL editor after push):

```sql
select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'public_spotlight_hub',
    'list_active_submission_pricing_plans',
    'dj_catalog_feed',
    'promos_object_is_active_editorial_spotlight_cover'
  )
order by proname;
```

| Check | Pass? |
|-------|-------|
| All migrations applied (remote = local list) | ☐ |
| `pricing_plans` has active submission tiers | ☐ |
| `editorial_spotlights` table exists | ☐ |
| `promos` bucket + RLS policies present | ☐ |

---

## Phase 3 — Production smoke testing

Execute on **https://digitalservicepack.com** after deploy. Full checklist: [PRODUCTION_SMOKE_TEST_PLAN.md](./PRODUCTION_SMOKE_TEST_PLAN.md).

| Area | Critical checks |
|------|-----------------|
| Public | Home, `/featured`, `/login`, `/privacy` — no 500 |
| Artist | Paid checkout → draft → upload cover + audio → submit → admin submissions |
| DJ | Approved feed, spotlight, feedback + rating, ZIP download |
| Admin | Submissions queue, spotlights, system health, payments reconciliation |
| Security | `/api/dev/*` → 404 on production |

**Mobile (Capacitor):** [TESTFLIGHT_SMOKE_TEST.md](./TESTFLIGHT_SMOKE_TEST.md)

---

## Phase 4 — Featured Spotlight content setup

| Task | Pass? |
|------|-------|
| Admin assigns editorial slots at `/admin/spotlights` (DJ Pick, New Release, etc.) | ☐ |
| Home `/` shows editorial strip when content exists (or hides cleanly) | ☐ |
| `/featured` logged out renders hub | ☐ |
| DJ Discover feed shows spotlight sections | ☐ |
| Paid **Featured Spotlight** (artist promote) separate from editorial | ☐ |
| Algorithmic sections (trending, most downloaded) hidden until ≥3 items | ☐ |
| Missing cover art → placeholder, no crash | ☐ |

---

## Phase 5 — Stripe safety verification

| Check | How | Pass? |
|-------|-----|-------|
| Webhook endpoint registered | Stripe Dashboard → `https://digitalservicepack.com/api/webhooks/stripe` | ☐ |
| Events: `checkout.session.completed`, `async_payment_succeeded`, `expired` | Dashboard → Webhook details | ☐ |
| Signing secret matches Vercel `STRIPE_WEBHOOK_SECRET` | `npm run verify:stripe-webhooks` (with prod env) | ☐ |
| Secret + publishable same mode | `npm run verify:stripe` | ☐ |
| **Local** verification uses **test** keys only | `npm run verify:launch-env` | ☐ |
| **Production** uses **live** keys only when launch approved | Vercel Production env + `/admin/system` | ☐ |
| Test checkout → webhook **2xx** | Stripe Dashboard → event log | ☐ |
| Submission payment → draft track + `payments.succeeded` | Supabase + artist edit page | ☐ |
| No unintended real charges during smoke | Use test mode locally; prod smoke only with approval | ☐ |

**Test card (Stripe test mode only):** `4242 4242 4242 4242`, any future expiry, any CVC.

---

## Release order

1. `npm run verify:launch-env` + `verify:stripe` (local, test keys)
2. `npm run db:push` → production Supabase
3. Vercel Production env verified → deploy `main`
4. `npm run verify:app-store` + production smoke plan
5. Assign editorial spotlight content
6. TestFlight device pass (iOS)
7. Sign GO/NO-GO table above

---

## Post-launch monitoring (24h)

- Vercel function logs (webhook errors, RSC failures)
- Stripe Dashboard → Webhooks delivery rate
- Supabase Auth logs (failed sign-in spikes)
- `/admin/system` health — no new **Fail** rows

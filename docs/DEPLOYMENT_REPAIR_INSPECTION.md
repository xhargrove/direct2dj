# Deployment repair — inspection snapshot

Created as part of the deployment readiness repair pass. **Not** a substitute for running migrations or smoke tests against production-like targets.

## 1. Current app stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js **16.2** (App Router, React 19) |
| Host target | **Vercel** (assumed; `VERCEL_URL` used in `getSiteUrl`) |
| Database / Auth / Storage | **Supabase** (Postgres, Auth, Storage, RLS) |
| Payments | **Stripe** Checkout + webhooks |
| Types | Hand-maintained `lib/types/database.ts` (+ optional generated path documented separately) |

## 2. Current Supabase client setup

| Client | File | Key | Usage |
|--------|------|-----|--------|
| Browser | `lib/supabase/client.ts` | Anon / publishable (`NEXT_PUBLIC_*`) | User-scoped RLS |
| Server (RSC/actions) | `lib/supabase/server.ts` | Anon + cookies | Session + RLS |
| Middleware | `middleware.ts` + `lib/supabase/middleware.ts` | Anon | Session refresh; `/dj` vetting gate |
| Trusted jobs | `lib/supabase/service-role.ts` | **Service role** (server-only) | Webhooks, role selector edge cases |

**No duplicate clients:** each file constructs `createServerClient` / `createBrowserClient` at call sites with one pattern per environment.

## 3. Auth / role / RLS strategy

- **Authentication:** Supabase Auth (cookies via `@supabase/ssr`).
- **Authorization:** `profiles.role` (`artist` | `dj` | `admin`); route layouts call `requireRoles()` / `getAdminContext()`.
- **Defense in depth:** Postgres **RLS** on tables; storage policies on `promos` bucket.
- **DJ vetting:** `middleware.ts` restricts non-approved DJs to `/dj/apply`, `/dj/application-status`, `/dj/settings`.

## 4. Stripe webhook flow

- **Endpoint:** `POST /api/webhooks/stripe`
- **Verification:** `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`
- **Activation:** `activateFeaturedFromCheckoutSession` (`lib/billing/activate-featured-checkout.ts`) branches to **featured** placement logic or **`activateSubmissionFromCheckoutSession`** for submission plans (same entrypoint).

## 5. Current deployment scripts (`package.json`)

| Script | Purpose |
|--------|---------|
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run db:push` | `npx supabase db push` — apply migrations to **linked** remote (or local per CLI context) |
| `npm run db:link` | Link CLI to Supabase project |
| `npm run types:supabase` | Generate types (see `docs/SUPABASE_TYPES_GENERATION.md`) |

## 6. Environment variables required

See **`docs/ENV_DEPLOYMENT_CHECKLIST.md`** for the full table. Minimum for app boot:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` **or** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Server-only where documented: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, webhooks, optional cron/integration secrets.

## 7. Migration files

All under **`supabase/migrations/`** — timestamp-prefixed SQL. **Parity with production is not verified by this repo alone**; operator must run `db:push` (or dashboard SQL) against the target project.

## 8. Debug / dev routes

| Path | Notes |
|------|------|
| `GET /api/dev/supabase-auth` | Dev-only probe; **404 in production** (`NODE_ENV === "production"`). |

See **`docs/DEV_DIAGNOSTIC_ROUTES.md`**.

## 9. Known blockers (from audit + inspection)

1. **Remote DB** must have all migrations applied (including RPCs for `/featured`, admin free draft, catalog feed).
2. **Vercel env** must match Supabase + Stripe projects (no cross-project URL/key mix).
3. **Stripe webhook** URL and events must be configured for deployed origin.
4. **Hand-maintained types** can drift — generate types per `docs/SUPABASE_TYPES_GENERATION.md`.
5. **Next.js** warns `middleware` → future **`proxy`** rename — not blocking runtime today.

## 10. Recommended fix order

1. Fill **`.env.local` / Vercel** per `docs/ENV_DEPLOYMENT_CHECKLIST.md`.
2. **`npm run db:link`** then **`npm run db:push`** to production project (or apply migrations in Dashboard).
3. Verify RPCs + storage policies per **`docs/SUPABASE_MIGRATION_PARITY_CHECKLIST.md`** and **`docs/STORAGE_DEPLOYMENT_CHECKLIST.md`**.
4. Configure **Stripe webhook** per **`docs/STRIPE_DEPLOYMENT_CHECKLIST.md`**.
5. Run **`docs/PRODUCTION_SMOKE_TEST_PLAN.md`**.
6. Optionally **`npm run types:supabase`** (local) and compare to hand types.

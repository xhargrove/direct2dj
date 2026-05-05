# Deploy readiness report

**Generated:** deployment repair pass (docs + targeted code). **Status is conditional** on operator execution of migrations and smoke tests.

## 1. Final status

**DEPLOY WITH CAUTION** — Codebase and docs are **aligned for deployment**, but **production GO** requires **manual** migration apply, env verification, Stripe webhook smoke, and **`PRODUCTION_SMOKE_TEST_PLAN.md`**.

## 2. Code quality

- **Lint / typecheck / build:** Run `npm run lint`, `npm run typecheck`, `npm run build` after changes (CI expected clean).
- **Tests:** `npm test` (Vitest) — unit tests for catalog helpers; **not** full E2E.

## 3. Supabase migrations

- **Readiness:** Documented in **`SUPABASE_MIGRATION_PARITY_CHECKLIST.md`**.
- **Verified against prod DB in this pass:** **No** (cannot from repo alone).

## 4. Supabase types

- **Script added:** `npm run types:supabase` → outputs `lib/types/database.generated.ts` (local Supabase).
- **Hand types:** `lib/types/database.ts` remains canonical for imports until team adopts generated file.

## 5. Environment

- **Checklist:** **`ENV_DEPLOYMENT_CHECKLIST.md`**
- **`.env.example`:** Present and aligned with `lib/supabase/env.ts`, Stripe, optional cron/integration.

## 6. Stripe

- **Checklist:** **`STRIPE_DEPLOYMENT_CHECKLIST.md`**
- **Webhook:** Signature verified; unhandled events no-op with `{ received: true }`.

## 7. Storage

- **`cover-sign`:** Logs **`[cover-sign]`** warnings with `pathTail` + error message (no full path).
- **Checklist:** **`STORAGE_DEPLOYMENT_CHECKLIST.md`**

## 8. Auth / security

- RLS + `requireRoles` unchanged.
- **Service role** server-only.
- **Dev routes** gated by **`NODE_ENV === "production"`** → 404; non-GET methods return 404 in prod.

## 9. Dev diagnostic routes

- **`docs/DEV_DIAGNOSTIC_ROUTES.md`**

## 10. Dead / legacy

- **`docs/DEAD_CODE_AND_LEGACY_PATHS.md`**

## 11. Middleware / proxy

- **`docs/NEXT16_PROXY_MIGRATION_NOTE.md`** — no `proxy.ts` migration in this pass.

## 12. Manual smoke

- **`PRODUCTION_SMOKE_TEST_PLAN.md`** — **required** before declaring GO.

## 13. Active blockers (external)

1. Production Supabase **migrations not applied** → RPC/storage failures.
2. Vercel **secrets missing/mismatched**.
3. Stripe **webhook not configured** or wrong mode.

## 14. Deferred (non-blockers)

- Rename `middleware.ts` → `proxy.ts` when Next guidance is stable.
- Replace hand types with generated types incrementally.

## 15. Exact deployment steps

1. Merge/commit repair branch.
2. Set **Vercel env** from `ENV_DEPLOYMENT_CHECKLIST.md`.
3. **`npm run db:link` && `npm run db:push`** against production Supabase (or Dashboard apply).
4. Configure **Stripe webhook**.
5. **Deploy** Vercel.
6. Run **`PRODUCTION_SMOKE_TEST_PLAN.md`**.
7. Optional: **`npm run types:supabase`** against linked local DB and diff types.

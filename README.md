# Digital Service Pack

Promo pool web app for **independent artists** (upload DJ packs, analytics, featured placements) and **DJs** (vetting-gated catalog, downloads, ratings, play reports). **Admins** moderate tracks and DJs.

Stack: **Next.js 16** (App Router), **Supabase** (Postgres + Auth + Storage + RLS), **Stripe** (featured checkout).

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_* , Stripe keys if testing billing, SUPABASE_SERVICE_ROLE_KEY for webhooks/notifications
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest (catalog validation helpers) |
| `npm run db:start` / `db:reset` / `db:push` | Supabase CLI |
| `npm run types:supabase` | Generate `lib/types/database.generated.ts` (local Supabase; see [docs/SUPABASE_TYPES_GENERATION.md](./docs/SUPABASE_TYPES_GENERATION.md)) |

## Documentation

| Doc | Contents |
|-----|----------|
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Env vars and secrets |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Tables and relationships |
| [RLS_POLICIES.md](./RLS_POLICIES.md) | Row Level Security overview |
| [MVP_TEST_PLAN.md](./MVP_TEST_PLAN.md) | Manual QA matrix |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | Production launch steps |
| [docs/DEPLOY_READINESS_REPORT.md](./docs/DEPLOY_READINESS_REPORT.md) | **Deploy gate summary** |
| [docs/ENV_DEPLOYMENT_CHECKLIST.md](./docs/ENV_DEPLOYMENT_CHECKLIST.md) | Vercel / env table |
| [docs/SUPABASE_MIGRATION_PARITY_CHECKLIST.md](./docs/SUPABASE_MIGRATION_PARITY_CHECKLIST.md) | DB + RPC verification |
| [docs/STRIPE_DEPLOYMENT_CHECKLIST.md](./docs/STRIPE_DEPLOYMENT_CHECKLIST.md) | Webhooks + smoke |
| [docs/PRODUCTION_SMOKE_TEST_PLAN.md](./docs/PRODUCTION_SMOKE_TEST_PLAN.md) | Post-deploy smoke |
| [docs/PHASE_4_5_DJ_CATALOG_SMOKE.md](./docs/PHASE_4_5_DJ_CATALOG_SMOKE.md) | DJ catalog manual smoke (Phase 4.5) |

## Architecture (high level)

- **Auth**: Supabase Auth; `profiles.role` is `artist` \| `dj` \| `admin`.
- **Route protection**: Route groups under `app/artist`, `app/dj`, `app/admin` use `requireRoles()`; `/dj/*` middleware additionally restricts non-approved DJs to apply/status/settings.
- **Data access**: Browser uses anon key + RLS; server actions use user-scoped Supabase client; Stripe webhook + bulk notifications use **service role** only in trusted server code.
- **Storage**: Private `promos` bucket; artists upload under `{user_id}/…`; DJs read via policies tied to visible `track_files`.

## Security notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` to the client.
- Configure Stripe webhook signing secret for `/api/webhooks/stripe`.
- Optional: `CRON_SECRET` for `/api/cron/notifications`, `DJ_MONITOR_PRO_WEBHOOK_SECRET` for integrations.

## License

Private / All rights reserved unless stated otherwise.

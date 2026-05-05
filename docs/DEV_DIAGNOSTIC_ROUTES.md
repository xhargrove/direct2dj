# Dev / diagnostic API routes

## Policy

- **`NODE_ENV === "production"`** is the **off switch** for dev diagnostics (`dynamic = "force-dynamic"` does **not** authenticate or hide routes by itself).
- **Never** return `SUPABASE_SERVICE_ROLE_KEY`, Stripe secrets, full cookies, or raw session tokens from these routes.
- Dev routes may return **anon/publishable** key **hints** (HTTP statuses, project ref from URL) — still **dev-only**.

## Routes

### `GET /api/dev/supabase-auth`

| | |
|--|--|
| **Purpose** | Probe Supabase Auth + PostgREST with `NEXT_PUBLIC_SUPABASE_*` to debug login / key mismatch locally. |
| **Production** | **`404`** JSON `{ "error": "Not found" }` — same body shape as unknown routes (no stack traces). |
| **Other methods** | **`POST` / `PUT` / `PATCH` / `DELETE`**: production **`404`**; development **`405`** Method Not Allowed. |
| **Secrets** | Uses **anon/publishable** key only (same as browser). Never uses service role. |
| **Manual check** | Production: `curl -s -o /dev/null -w "%{http_code}" https://YOUR_DOMAIN/api/dev/supabase-auth` → **404**. |

### `GET /api/dev/stripe-config`

| | |
|--|--|
| **Purpose** | Validate `STRIPE_*` / `NEXT_PUBLIC_STRIPE_*` shape (test vs live match), optional `STRIPE_WEBHOOK_SECRET`, and **ping Stripe** with `balance.retrieve()` using the secret key. |
| **Production** | **`404`** — dev only. |
| **Secrets** | Response never includes key values. |

**CLI (no dev server):** from repo root, `npm run verify:stripe` loads `.env.local` and runs the same API-style checks plus `balance.retrieve()`.

### Other `/api/*` (non-dev)

| Route | Prod behavior |
|-------|----------------|
| `POST /api/webhooks/stripe` | Requires valid Stripe signature + `STRIPE_WEBHOOK_SECRET` |
| `GET /api/cron/notifications` | Requires `Authorization: Bearer CRON_SECRET` |
| `POST /api/integrations/dj-monitor-pro/verified-play` | Requires bearer secret or **503** if unset |
| `POST /api/checkout/featured` | Authenticated artist checkout |
| `POST /api/admin/sign-storage` | Admin session + registered `track_files` path |

## Verification checklist

1. Deploy to production.
2. Confirm **`GET /api/dev/supabase-auth`** → **404**.
3. Confirm **`POST /api/dev/supabase-auth`** → **404**.
4. Search codebase for **`SUPABASE_SERVICE_ROLE_KEY`** in `app/` and `components/` — must appear **only** in server-only modules (API routes, `lib/supabase/service-role.ts`, server actions), never in client bundles.
5. Confirm **`GET /api/dev/stripe-config`** → **404** on production.

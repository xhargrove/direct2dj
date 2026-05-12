# Environment — deployment checklist

Use this for **Vercel** (or any host) **Preview** and **Production**. Values must come from **one** Supabase project and **one** Stripe account (test vs live consistent).

## Public (browser-safe)

| Variable | Required | Used for |
|----------|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase client URL (`lib/supabase/env.ts`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` **or** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Yes** (one of) | Anon/publishable key |
| `NEXT_PUBLIC_SITE_URL` | **Recommended** | Canonical site base for Stripe success/cancel redirects (`lib/billing/site-url.ts`). If unset on Vercel, **`https://${VERCEL_URL}`** is used. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | If client uses Stripe.js | Checkout/embed (if referenced in app) |

**Verify:** Open browser devtools → Application → no `service_role` or `sk_live` / `sk_test` in client bundles.

## Server-only (never `NEXT_PUBLIC_*`)

| Variable | Required | Used for |
|----------|----------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** for webhooks / trusted jobs **and admin DJ pack signed uploads** | `createServiceRoleClient()`, Stripe activation, notifications sweep, `POST /api/admin/tracks/prepare-signed-pack-upload` |
| `STRIPE_SECRET_KEY` | **Yes** for billing | `lib/stripe/server.ts`, Checkout session creation |
| `STRIPE_WEBHOOK_SECRET` | **Yes** for live payments | `app/api/webhooks/stripe/route.ts` — returns **500** if missing |

## Optional

| Variable | Used for |
|----------|----------|
| `CRON_SECRET` | `GET /api/cron/notifications` — **Bearer** match |
| `DJ_MONITOR_PRO_WEBHOOK_SECRET` | POST verified-play integration |
| `ENABLE_LOGIN_ROLE_SELECTOR` | Login role picker (`lib/auth/login-role-selector.ts`) |
| Email provider vars | `lib/notifications/email.ts` (Resend / SendGrid / Postmark) |

## Failure symptoms

| Symptom | Likely cause |
|---------|----------------|
| Build OK, runtime 500 on webhook | Missing `STRIPE_WEBHOOK_SECRET` or wrong signing secret |
| Auth works, `prepare-signed-pack-upload` returns **422** with `MISSING_SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` missing for that Vercel environment — add it and redeploy. The UI falls back to direct Storage upload when possible. |
| Auth works, DB queries empty/wrong | Wrong project URL/key pair |
| Redirect after Stripe goes to wrong host | Missing `NEXT_PUBLIC_SITE_URL` on non-Vercel or wrong value |
| Cron 401 | `CRON_SECRET` mismatch or missing header |

## Vercel

1. Project → **Settings → Environment Variables** — set for **Production** (and **Preview** if you test there).
2. Redeploy after changing secrets.
3. Never paste **service role** or **Stripe secret** into client-side env keys.

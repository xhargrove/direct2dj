# Environment variables

Copy [.env.example](./.env.example) to `.env.local` for local development. Production hosts (e.g. Vercel) should set the same keys in the project dashboard.

## Required for core app

| Variable | Used by | Notes |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Publishable/anon key (same project as URL) |
| `NEXT_PUBLIC_SITE_URL` | Stripe redirects, emails | Canonical site URL (e.g. `https://app.example.com`) |

## Required for server-only features

| Variable | Used by | Notes |
|----------|---------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Stripe activation of featured placements, notification inserts, cron-style jobs | Bypasses RLS — server only |

Without the service role key, **featured checkout completion** and **in-app notification creation** will not persist rows that depend on elevated access.

## Stripe (featured placements)

| Variable | Notes |
|----------|--------|
| `STRIPE_SECRET_KEY` | Server |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client checkout redirect flows if used |
| `STRIPE_WEBHOOK_SECRET` | Verifies `POST /api/webhooks/stripe` |

## Notifications (optional email)

Email sends only when a provider is configured (`RESEND_API_KEY`, `SENDGRID_API_KEY`, or `POSTMARK_SERVER_TOKEN`) plus matching From-address vars — see `.env.example`.

## Ops / integrations

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | `Authorization: Bearer …` for `GET /api/cron/notifications` |
| `DJ_MONITOR_PRO_WEBHOOK_SECRET` | Bearer auth for `POST /api/integrations/dj-monitor-pro/verified-play` |

## Vercel

`VERCEL_URL` is set automatically; used as fallback when building absolute URLs if `NEXT_PUBLIC_SITE_URL` is unset.

## Validation

- Restart dev server after changing `.env.local`.
- Use `GET /api/dev/supabase-auth` (development only) to verify anon key acceptance.

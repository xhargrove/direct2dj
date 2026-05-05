# Deployment checklist (production)

Use this before pointing a production domain at Digital Service Pack.

## Supabase

- [ ] Production project created; URL + anon key match in env.
- [ ] **Auth**: redirect URLs include production domain.
- [ ] **Migrations applied**: `supabase db push` or CI pipeline against prod.
- [ ] **Service role key** stored only on server (Vercel env, never `NEXT_PUBLIC_*`).
- [ ] Storage bucket `promos` exists; policies deployed with migrations.

## Stripe

- [ ] Live API keys (or test keys for pilot) in env.
- [ ] Webhook endpoint `POST /api/webhooks/stripe` registered with **signing secret** in env.
- [ ] Success/cancel URLs match `NEXT_PUBLIC_SITE_URL`.

## Application host (e.g. Vercel)

- [ ] `NEXT_PUBLIC_SITE_URL` set to canonical HTTPS URL.
- [ ] All keys from [ENVIRONMENT.md](./ENVIRONMENT.md) configured.
- [ ] Optional: `CRON_SECRET` + scheduled job hitting `/api/cron/notifications` for featured sweeps.

## Email (optional)

- [ ] Provider API key + From domain verified (Resend/SendGrid/Postmark).
- [ ] Send a test notification with provider enabled.

## Smoke tests (staging first)

- [ ] Login each role (artist, DJ approved, admin).
- [ ] DJ pending blocked from feed via middleware.
- [ ] Checkout test mode end-to-end (placement row + payment succeeded).
- [ ] Featured row expires → disappears from DJ feed featured strip.

## Monitoring

- [ ] Supabase logs / Vercel function logs monitored first 24h.
- [ ] Stripe webhook delivery dashboard shows 2xx.

## Rollback

- [ ] Tag release in git; keep previous deployment promotable.
- [ ] DB migrations: prefer forward fixes; document destructive changes separately.

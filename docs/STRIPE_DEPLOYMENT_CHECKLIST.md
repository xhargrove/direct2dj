# Stripe deployment checklist

## Webhook endpoint

- **URL:** `https://<your-domain>/api/webhooks/stripe`
- **Method:** `POST`
- **Auth:** Stripe signature header `Stripe-Signature` + **`STRIPE_WEBHOOK_SECRET`** (Dashboard signing secret, not the API key)

## Server env (Vercel)

| Variable | Required |
|----------|----------|
| `STRIPE_SECRET_KEY` | Yes — Checkout session creation |
| `STRIPE_WEBHOOK_SECRET` | Yes — Webhook handler returns **500** if missing |
| `NEXT_PUBLIC_SITE_URL` or Vercel `VERCEL_URL` | Redirect URLs (`lib/billing/site-url.ts`) |

## Events handled in code

From `app/api/webhooks/stripe/route.ts`:

| Event | Behavior |
|-------|----------|
| `checkout.session.completed` | `activateFeaturedFromCheckoutSession(session)` + revalidate |
| `checkout.session.async_payment_succeeded` | Same with `trustPaymentComplete: true` |
| `checkout.session.expired` | `markCheckoutSessionExpired` |
| **All other types** | **No-op** — returns `{ received: true }` (idempotent / safe) |

**Activation path:** `activateFeaturedFromCheckoutSession` → for **submission** plan kind, delegates to **`activateSubmissionFromCheckoutSession`** (creates draft track, etc.). **One canonical path** — not duplicate webhook systems.

## Idempotency

- Payment rows and track creation are guarded in **`lib/billing/activate-submission-checkout.ts`** / featured activation (check existing `track_id`, plan metadata). **Replays** should not double-create if implemented correctly—still **smoke test** after first deploy.

## Local CLI test

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# triggers checkout in dev; watch CLI for delivery
```

Use **test mode** keys and webhook signing secret from Stripe CLI or Dashboard.

## Dashboard setup (live)

1. Developers → Webhooks → Add endpoint → URL above.
2. Select events: at minimum **`checkout.session.completed`**, **`checkout.session.async_payment_succeeded`**, **`checkout.session.expired`** (match code).
3. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET` in Vercel.

## Smoke (manual — required for GO)

1. **Submission:** Artist completes paid checkout → webhook fires → draft track exists + payment succeeded (see Billing).
2. **Featured:** Artist completes featured checkout → placement row + notifications per product rules.
3. Stripe Dashboard → Webhook deliveries → **200** responses.

**Do not** claim production Stripe readiness without at least one successful **delivered** webhook in the target mode (test vs live).

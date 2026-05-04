# Direct 2 DJ — foundation

This document describes the initial structure you asked for: **route map**, **database schema plan**, and **environment checklist**. The executable source of truth for SQL is `supabase/migrations/`.

## Route map

| Path | Access | Purpose |
|------|--------|---------|
| `/` | Public | Marketing shell; shows session-aware links (workspace, sign in, sign out). |
| `/login` | Public | Email/password sign-in and sign-up via Supabase Auth (`signInWithPassword`, `signUp`). |
| `/auth/callback` | OAuth / magic-link return | Exchanges `code` for a session (`exchangeCodeForSession`) and redirects safely in-app. |
| `/auth/sign-out` | Authenticated | POST-only route handler; clears the Supabase session and redirects to `/login`. |
| `/artist` | `profiles.role = artist` | Artist workspace (layout enforces role). |
| `/dj` | `profiles.role = dj` | DJ workspace (layout enforces role). |
| `/admin` | `profiles.role = admin` | Admin workspace (layout enforces role). |
| `POST /api/webhooks/stripe` | Stripe servers | Verifies `Stripe-Signature`; extend `switch (event.type)` for billing logic using the **service role** or Stripe APIs — never trust client-only checks for paid features. |

Canonical role homes are **`/artist`**, **`/dj`**, and **`/admin`** only (no duplicate `/dashboard/*` tree).

## Database schema plan

Applied in `supabase/migrations/20260503120000_init_direct2dj.sql`.

| Object | Notes |
|--------|--------|
| `public.user_role` enum | `artist`, `dj`, `admin`. |
| `public.profiles` | One row per `auth.users` row; `role` defaults to `artist`. Created by `on_auth_user_created` trigger (reads optional `full_name` from signup metadata). **Do not** use `user_metadata` for authorization; `role` lives in Postgres and is enforced by RLS + triggers. |
| `public.stripe_customers` | Maps `user_id` ↔ `stripe_customer_id` for server-side billing (writes via service role or privileged backend, not from the browser). |
| `storage.buckets.promos` | Private bucket; object paths must start with `{auth.uid()}/` for upload/read/update/delete by the owner. DJ-wide reads are intentionally not implemented yet (would require a grants/shares model and policies). |
| RLS | Enabled on `profiles` and `stripe_customers`. `public.is_admin(uuid)` is `SECURITY DEFINER` to avoid recursive policy checks. Role changes are blocked unless the current user is an admin (`profiles_guard_role_change`). |

**Operational note:** New accounts are **`artist`** until an admin updates `profiles.role` for DJ or admin access.

## Environment variable checklist

Copy `.env.example` to `.env.local` for local development.

| Variable | Required for | Notes |
|----------|----------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | App + middleware | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App + middleware | Browser-safe key (legacy name “anon”; publishable key in newer dashboards). Never use the service role key in `NEXT_PUBLIC_*`. |
| `NEXT_PUBLIC_SITE_URL` | Redirects, emails (future) | Production domain, e.g. `https://direct2dj.com`. |
| `STRIPE_SECRET_KEY` | Webhooks + server billing | Server-only; use test keys in preview/staging. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client Checkout / Elements (when you add them) | Safe to expose. |
| `STRIPE_WEBHOOK_SECRET` | `POST /api/webhooks/stripe` | From Stripe Dashboard for this endpoint. |

On **Vercel**, set the same keys in Project → Settings → Environment Variables for Production and Preview as appropriate.

## Supabase Dashboard alignment

After deploying SQL:

1. **Auth → URL configuration:** add site URL and redirect URLs (`http://localhost:3000/**`, production origin).
2. **Auth providers:** enable Email (and any OAuth providers you plan to use).
3. **Storage:** confirm bucket `promos` exists if the migration ran successfully.

## Stripe alignment

1. Create a webhook endpoint pointing to `https://<your-domain>/api/webhooks/stripe`.
2. Subscribe to the events you will handle (`checkout.session.completed`, `customer.subscription.updated`, etc.).
3. Paste the signing secret into `STRIPE_WEBHOOK_SECRET`.

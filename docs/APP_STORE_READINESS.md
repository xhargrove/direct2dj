# App Store readiness checklist

Native iOS uses **Capacitor as a shell** around the production Next.js app at **https://digitalservicepack.com**. The web app is deployed on Vercel; the App Store binary does not bundle the full site — it loads it over HTTPS.

See also: [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md), [ENVIRONMENT.md](../ENVIRONMENT.md).

---

## 1. Production web deployment

### Vercel environment (Production)

Set in **Project → Settings → Environment Variables** (Production):

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same Supabase project as keys below |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only — webhooks, notifications, admin storage |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://digitalservicepack.com` (no trailing slash) |
| `STRIPE_SECRET_KEY` | Yes | Live or test per launch plan |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Matches Stripe mode |
| `STRIPE_WEBHOOK_SECRET` | Yes | Signing secret for `POST /api/webhooks/stripe` |

Optional: `CRON_SECRET`, email provider keys, `DJ_MONITOR_PRO_WEBHOOK_SECRET` — see `.env.example`.

### Supabase (production project)

- [ ] **Auth → URL configuration**: Site URL and redirect URLs include `https://digitalservicepack.com` and `https://digitalservicepack.com/auth/callback` (and any preview host you use).
- [ ] **Migrations applied**: `supabase db push` against production (or CI).
- [ ] **Storage**: `promos` bucket and RLS policies from migrations.

### Stripe

- [ ] Webhook endpoint: `https://digitalservicepack.com/api/webhooks/stripe`
- [ ] Success/cancel URLs use `NEXT_PUBLIC_SITE_URL` (artist checkout, featured placement).

### Deploy and smoke test (production)

```bash
# After push to main (Vercel auto-deploy) or manual: npx vercel deploy --prod
curl -sS https://digitalservicepack.com/api/health
# → {"ok":true}

npm run verify:launch   # local gate before shipping web changes
```

Manual checks on **https://digitalservicepack.com**:

- [ ] **Login** — artist, DJ, admin (or co_admin) sign-in and redirect to correct dashboard.
- [ ] **Artist** — dashboard, new submission / checkout (test mode if using test Stripe keys).
- [ ] **DJ (approved)** — Discover feed, track detail, feedback, pack download.
- [ ] **DJ (pending)** — gated from feed; application status visible.
- [ ] **Label** — roster/catalog if used.
- [ ] **Admin / Backstage** — tracks, submissions, spotlights, DJ applications.
- [ ] **Stripe** — complete a test checkout; confirm webhook 2xx in Stripe Dashboard and row updates in Supabase.

---

## 2. Capacitor iOS production config

### Source of truth

| File | Role |
|------|------|
| `capacitor.config.ts` | Edited in repo; drives `npx cap sync` |
| `ios/App/App/capacitor.config.json` | **Generated** — run `npm run cap:sync:prod` before Xcode archive |
| `capacitor-web/` | Offline placeholder only (“Loading…”) if the remote URL fails briefly |

**Production server URL:** `https://digitalservicepack.com`  
**Cleartext HTTP:** disabled for App Store builds (`cleartext: false`).

### Sync iOS project for App Store

```bash
# Do NOT set CAPACITOR_SERVER_URL for release builds
npm run cap:sync:prod
npm run cap:open:ios
```

In Xcode: select **Any iOS Device** or **Archive**, increment **Version / Build**, **Product → Archive**.

### Local dev only (not for App Store)

To point the shell at local Next.js:

```bash
CAPACITOR_DEV=1 CAPACITOR_SERVER_URL=http://127.0.0.1:3000 npm run cap:sync
```

Requires `npm run dev` and (on device) same Wi‑Fi / LAN IP instead of `127.0.0.1`. Do **not** ship an archive built with this URL.

### Pre-submission iOS checks

- [ ] `ios/App/App/capacitor.config.json` → `server.url` is `https://digitalservicepack.com`
- [ ] `server.cleartext` is `false`
- [ ] App icon & launch screen assets in `ios/App/App/Assets.xcassets`
- [ ] `ITSAppUsesNonExemptEncryption` = false in `Info.plist` (already set)
- [ ] Privacy policy URL: **https://digitalservicepack.com/privacy** (in App Store Connect)
- [ ] Support URL: **https://digitalservicepack.com/support**
- [ ] TestFlight smoke test: [TESTFLIGHT_SMOKE_TEST.md](./TESTFLIGHT_SMOKE_TEST.md) (~10 min on device)
- [ ] Test on **physical device**: cold launch, login, DJ feed, Stripe checkout (opens in-app browser), sign-out

### Known benign Xcode console noise

- WebKit / keyboard constraint warnings in Simulator  
- `CHHapticPattern` missing in Simulator  
- `JS Eval error` once at Capacitor bridge injection (often non-fatal if `WebView loaded` follows)  
- Image decode errors for corrupt promo art — mitigated on web with `SafeCoverImage` fallbacks  

---

## 3. Quick verification script

```bash
npm run verify:app-store
```

Checks production health URL, `/login`, `/privacy`, and that Capacitor config files target HTTPS with cleartext off.

---

## 4. Release order

1. Apply Supabase migrations and env vars on production.  
2. Deploy web (`main` → Vercel).  
3. Run production smoke tests in Safari.  
4. `npm run cap:sync:prod` → Xcode Archive → TestFlight → App Store.  
5. Monitor Vercel logs, Stripe webhooks, and Supabase Auth for 24h after launch.

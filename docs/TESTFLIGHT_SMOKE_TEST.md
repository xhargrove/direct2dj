# TestFlight smoke test (~10 minutes)

Run on a **physical iPhone** with a **TestFlight** build archived after `npm run cap:sync:prod`. Production must be live at **https://digitalservicepack.com**.

Use two test accounts if possible: one **approved DJ**, one **artist** (or admin). Stripe in **test mode** is fine for checkout.

---

## Before you start

- [x] `npm run verify:app-store` passes on your machine
- [x] TestFlight build is newer than your last web deploy (or web is already on latest `main`)
- [x] You know test account emails/passwords (App Review notes can list these)

---

## 1. Cold launch (1 min)

| Step | Pass? |
|------|-------|
| Force-quit the app, reopen from home screen | p |
| Splash / loading, then home or login (no stuck white screen) | p  |
| No persistent “Something went wrong” / Load failed | p |

---

## 2. Sign in & navigation (2 min)

| Step | Pass? |
|------|-------|
| Open **Log in**, sign in as **DJ** (approved) | p |
| Lands on DJ dashboard or feed (not login loop) |p |
| Tap **Home** or logo — page loads without blank error | p |
| Open **How it works** (`/featured`) — spotlight cards render | p |
| Sign out | p |

---

## 3. DJ workspace (3 min)

Sign in again as approved DJ.

| Step | Pass? |
|------|-------|
| **Discover** (`/dj/feed`) — catalog + spotlight load | p |
| **Filter catalog** sidebar — change genre/BPM; list updates | p |
| Open a track — detail panel, artwork (or fallback), preview if available | p |
| Submit feedback or rating — no crash; panel stays usable | p |
| **Downloads** — list loads; one pack download starts or completes | p |

---

## 4. Artist / payments (2 min, optional)

Sign out → sign in as **artist**.

| Step | Pass? |
|------|-------|
| Artist dashboard loads | p |
| Start a submission or promote flow → Stripe opens (in-app browser / Safari) | p |
| Complete test checkout → return to site; status updates (check Stripe webhook 2xx) | p |

---

## 5. Native shell checks (1 min)

| Step | Pass? |
|------|-------|
| Airplane mode ON → open app → clear error or offline message (not infinite spinner) | p |
| Airplane mode OFF → reload / reopen → works again | p |
| External link (if any) opens expected browser behavior | p |

---

## 6. App Store Connect metadata

| Item | Value |
|------|--------|
| Privacy Policy URL | `https://digitalservicepack.com/privacy` |
| Support URL | `https://digitalservicepack.com/support` |
| Marketing URL (optional) | `https://digitalservicepack.com` |

---

## If something fails

| Symptom | Likely fix |
|---------|------------|
| Login loop after sign-in | Deploy latest web; confirm Supabase redirect URLs include production domain |
| Load failed / WKWebView errors | `npm run cap:sync:prod`; confirm `capacitor.config.json` URL is HTTPS |
| Broken promo images | Already mitigated with safe fallbacks; check specific track in admin |
| Stripe does not return | `NEXT_PUBLIC_SITE_URL` on Vercel; webhook secret and endpoint |
| Filter/sidebar blank | Hard refresh; test same path in mobile Safari |

Log failures with: device model, iOS version, TestFlight build number, URL, screenshot.

---

## Sign-off

| Role | Name | Date | Ready for App Store review? |
|------|------|------|----------------------------|
| Owner | Xavier Hargrove | 2026-06-03 | Yes — no blockers |

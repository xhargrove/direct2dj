# TestFlight smoke test (~10 minutes)

Run on a **physical iPhone** with a **TestFlight** build archived after `npm run cap:sync:prod`. Production must be live at **https://digitalservicepack.com**.

Use two test accounts if possible: one **approved DJ**, one **artist** (or admin). Stripe in **test mode** is fine for checkout.

---

## Before you start

- [ ] `npm run verify:app-store` passes on your machine
- [ ] TestFlight build is newer than your last web deploy (or web is already on latest `main`)
- [ ] You know test account emails/passwords (App Review notes can list these)

---

## 1. Cold launch (1 min)

| Step | Pass? |
|------|-------|
| Force-quit the app, reopen from home screen | ☐ |
| Splash / loading, then home or login (no stuck white screen) | ☐ |
| No persistent “Something went wrong” / Load failed | ☐ |

---

## 2. Sign in & navigation (2 min)

| Step | Pass? |
|------|-------|
| Open **Log in**, sign in as **DJ** (approved) | ☐ |
| Lands on DJ dashboard or feed (not login loop) | ☐ |
| Tap **Home** or logo — page loads without blank error | ☐ |
| Open **How it works** (`/featured`) — spotlight cards render | ☐ |
| Sign out | ☐ |

---

## 3. DJ workspace (3 min)

Sign in again as approved DJ.

| Step | Pass? |
|------|-------|
| **Discover** (`/dj/feed`) — catalog + spotlight load | ☐ |
| **Filter catalog** sidebar — change genre/BPM; list updates | ☐ |
| Open a track — detail panel, artwork (or fallback), preview if available | ☐ |
| Submit feedback or rating — no crash; panel stays usable | ☐ |
| **Downloads** — list loads; one pack download starts or completes | ☐ |

---

## 4. Artist / payments (2 min, optional)

Sign out → sign in as **artist**.

| Step | Pass? |
|------|-------|
| Artist dashboard loads | ☐ |
| Start a submission or promote flow → Stripe opens (in-app browser / Safari) | ☐ |
| Complete test checkout → return to site; status updates (check Stripe webhook 2xx) | ☐ |

---

## 5. Native shell checks (1 min)

| Step | Pass? |
|------|-------|
| Airplane mode ON → open app → clear error or offline message (not infinite spinner) | ☐ |
| Airplane mode OFF → reload / reopen → works again | ☐ |
| External link (if any) opens expected browser behavior | ☐ |

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
| Owner | | | ☐ Yes ☐ No — blockers: |

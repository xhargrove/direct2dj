# Local development troubleshooting

## Start the app

From the repo root:

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Default dev script is `next dev`, which listens on **port 3000** unless something else is bound there.

## Correct local URL

- **Main app:** `http://localhost:3000`
- **If you used another port:** `http://localhost:<port>` (see terminal output: `Local: http://localhost:…`)

## Port 3000 conflicts

See what is listening:

```bash
lsof -i :3000
```

- If another **Node** process is using 3000, stop that dev server or choose a different port.
- Start Next on another port:

```bash
npx next dev -p 3001
```

Then open `http://localhost:3001`.

## Clear stale Next.js cache

If you see odd compile errors, missing routes after refactors, or corrupted `.next`:

```bash
rm -rf .next
npm run dev
```

Do **not** delete application source files—only the build cache directory.

## `chrome-error://chromewebdata` and “Unsafe attempt to load URL … localhost …”

Chrome shows **`chrome-error://chromewebdata/`** when a **navigation failed** (connection refused, DNS, timeout, etc.). That page is a special internal URL.

If an embedded preview, iframe, or recovery flow tries to load `http://localhost:3000` **from** that error context, Chrome logs a security warning about mixing origins. **This is usually a browser/preview framing issue, not proof that your Next app is broken.**

**Fix in practice:** ensure `npm run dev` is running and open **`http://localhost:3000` in a normal browser tab** (not only the IDE embedded preview).

## Why IDE embedded previews mislead

Previews sometimes:

- Load before the dev server is ready → Chrome error page → confusing console noise.
- Run in a nested browsing context that behaves differently from a full tab.

Use a **normal Chrome/Safari/Firefox tab** for authoritative “does localhost work?” checks.

## Verify in a normal browser tab

1. Terminal shows Next ready (e.g. “Ready” / local URL).
2. Open **`http://localhost:3000`** in Chrome (regular tab).
3. Confirm the marketing/home UI renders (not Chrome’s “This site can’t be reached”).
4. Open **`http://localhost:3000/login`** — sign-in and sign-up use the **same page** (toggle “Create account”); there is no separate `/sign-up` route.
5. Optional: **`http://localhost:3000/api/health`** — should return `{"ok":true}`.

## Required environment variables (local)

Minimum for Auth and Supabase client (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe key |

Optional but common:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (often `http://localhost:3000`) |

Missing URL/key usually causes **runtime** errors in server logs or failed auth—not an empty Chrome tab by itself.

## If `/api/dev/supabase-auth` fails (development only)

This route is **dev-only** and checks that Supabase Auth accepts your anon key.

- **401 / misconfiguration:** Re-copy **both** `NEXT_PUBLIC_SUPABASE_URL` and the anon/publishable key from the **same** Supabase project (Dashboard → Project Settings → API). Mismatched URL + key is a frequent cause.
- **Unreachable Supabase:** Check VPN/firewall and that the URL is correct for cloud vs local Supabase (`supabase start` → use URL from `supabase status`).

See also: `docs/DEV_DIAGNOSTIC_ROUTES.md`, `docs/LOCAL_SUPABASE.md`.

## “Failed to fetch RSC payload … Falling back to browser navigation” (dev console)

Client-side `<Link>` navigations fetch a **React Server Components flight** response. If the server is slow to emit the first chunk (e.g. **`await getRoleDashboardPath()`** on `/login` waiting on Supabase), the client may log this warning and **perform a full document navigation** instead. That fallback usually **still works**; it is noisy in dev.

This repo adds **`app/login/loading.tsx`** so `/login` can **stream a loading UI immediately** while session checks complete. If the message persists only with Turbopack, try **`npm run dev:webpack`**.

## `/dj/*` pages hang or never finish loading

DJ routes run extra vetting logic in the Next proxy (`proxy.ts`). If PostgREST is slow or unreachable, row lookups are **capped at a few seconds** so the tab does not hang forever. If vetting data never arrives in time, you may be redirected as if data were missing—fix **Supabase URL/key/reachability** (same as Auth issues).

## Turbopack vs Webpack

Default `npm run dev` uses Turbopack. If you hit a bundler-specific issue:

```bash
npm run dev:webpack
```

## Quick health check

```bash
curl -sS http://localhost:3000/api/health
# {"ok":true}
```

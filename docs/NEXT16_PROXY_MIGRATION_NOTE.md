# Next.js 16 — `middleware` vs `proxy` note

## Current state (this repo)

- **File:** `proxy.ts` at project root (exports `middleware` for Next.js compatibility).
- **Behavior:** `updateSession` for all matched routes; additional **DJ vetting** gate for `/dj/*` (non-approved DJs redirected to application status / allowed paths).
- **Session helper:** `lib/supabase/middleware.ts`.

## Build output

Next.js 16 build may show:

> ƒ Proxy (Middleware)

This reflects the **`proxy.ts`** entry point while retaining the middleware export name Next expects.

## Historical note

Earlier passes used `middleware.ts` at project root. The project has migrated to **`proxy.ts`** per Next 16 guidance. Re-test after any rename:

- Session refresh
- `/dj` vetting redirects
- Supabase cookie copy on redirect

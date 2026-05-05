# Next.js 16 — `middleware` vs `proxy` note

## Current state (this repo)

- **File:** `middleware.ts` at project root.
- **Behavior:** `updateSession` for all matched routes; additional **DJ vetting** gate for `/dj/*` (non-approved DJs redirected to application status / allowed paths).
- **`proxy.ts`:** **Does not exist** — no duplicate.

## Build warning

Next.js 16 may log:

> The "middleware" file convention is deprecated. Please use "proxy" instead.

This is a **framework migration path** notice. **`middleware` still runs** in current Next 16.2.x.

## This pass

- **No migration** to `proxy.ts` — not required for deployment readiness; **test all redirects and cookie behavior** if you rename in a follow-up.
- **Document only:** when Next documents stabilize, migrate using official guide and re-test:
  - Session refresh
  - `/dj` vetting redirects
  - Supabase cookie copy on redirect

## Risk if ignored

- Future Next major may remove `middleware` filename — **medium-term** tech debt, **not** a current production blocker.

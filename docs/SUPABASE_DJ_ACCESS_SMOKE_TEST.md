# Supabase DJ access smoke test

Manual verification checklist for auth, roles, DJ applications, and workspace routing in production (or staging linked to Supabase project `byrtglihcniteryfkcgr`).

## Prerequisites

- App deployed or running locally with production/staging env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server `SUPABASE_SERVICE_ROLE_KEY` only on server).
- Test accounts (real Supabase auth users — no mock data):
  - Artist account (`profiles.role = artist`)
  - DJ pending without application
  - DJ pending with submitted application
  - DJ approved
  - DJ rejected (optional)
  - Account with auth user but missing profile (if available)

## Sign-out

1. Open `/dj/dashboard` while signed out.
2. **Expected:** Redirect to `/login` or gate with “Please sign in to continue”.

## Artist on DJ workspace

1. Sign in as artist.
2. Visit `/dj/dashboard`.
3. **Expected:** Title “This account is registered as an artist” with link to `/dj/apply`. No generic “under review” message.
4. Visit `/dj/feed` directly.
5. **Expected:** Same artist gate; no catalog content.

## DJ without application

1. Sign in as DJ with `djs.vetting_status = pending` and no `dj_applications` row.
2. Visit `/dj/dashboard`.
3. **Expected:** Banner/title “Your DJ application is not complete yet” with link to `/dj/apply`.
4. Visit `/dj/feed`.
5. **Expected:** Redirect to `/dj/application-status` (middleware) with not-started messaging.

## DJ pending (submitted)

1. Sign in as DJ with pending vetting and a `dj_applications` row.
2. Visit `/dj/dashboard`.
3. **Expected:** “Your DJ application is under review” (not “not complete”).
4. Visit `/dj/downloads`.
5. **Expected:** Redirect to `/dj/application-status`; no download UI.

## DJ approved

1. Sign in as approved DJ (`djs.vetting_status = approved`).
2. Visit `/dj/feed` and `/dj/downloads`.
3. **Expected:** Full DJ nav; catalog loads; downloads work after rating rules.

## DJ rejected

1. Sign in as rejected DJ.
2. Visit `/dj/application-status`.
3. **Expected:** “Your DJ application was not approved” with link to `/support`.
4. `/dj/apply` remains available to update and resubmit.

## No profile

1. Sign in with auth user lacking `profiles` row (if test account exists).
2. Visit `/dj/dashboard`.
3. **Expected:** “Account setup is incomplete” with link to `/onboarding`.

## RLS (browser / API)

1. As pending DJ, open browser devtools → Network while loading a promo file URL or call an API that reads `track_files` for catalog content.
2. **Expected:** No file bytes for unapproved DJ (empty/error), while approved DJ succeeds.
3. As artist, attempt to read another user’s `dj_applications` via Supabase client in console (anon key + session).
4. **Expected:** RLS denies rows not owned by the user.

## Application submit

1. As eligible pending DJ, complete `/dj/apply` and submit.
2. **Expected:** Redirect to `/dj/application-status?submitted=1`; row in `dj_applications`; vetting remains `pending` (or `pending` after resubmit from `rejected`).
3. Duplicate submit for same `dj_id`.
4. **Expected:** Upsert updates existing row; no duplicate key error shown to user.

## Admin

1. Admin approves DJ in `/admin/dj-applications`.
2. DJ refreshes workspace.
3. **Expected:** State becomes `DJ_APPROVED`; catalog routes unlock.

## Automated checks

```bash
npm run verify:launch
npm test -- lib/auth/account-access-state.test.ts
```

After DB migration deploy:

```bash
npm run db:push
```

Verify migration `20260605120000_dj_vetting_rls_hardening.sql` applied (DJ self-approve blocked; `track_files` vetting restored).

# Launch verified

**Repo gate:** automated checks in this document must pass before every production deploy.  
**Production gate:** complete [LAUNCH_VERIFICATION.md](./LAUNCH_VERIFICATION.md) and [PRODUCTION_SMOKE_TEST_PLAN.md](./PRODUCTION_SMOKE_TEST_PLAN.md) on the live environment after deploy.

Last verified in repo: **2026-06-02** (commit on `main` after spotlight hub, DJ ZIP download, rating gate, editorial cover policy).

---

## 1. Automated verification (run locally / CI)

```bash
npm run verify:launch
```

| Check | Command | Required |
|-------|---------|----------|
| ESLint | `npm run lint` | Pass (0 errors) |
| TypeScript | `npm run typecheck` | Pass |
| Unit tests | `npm test` | Pass (44 tests) |
| Production build | `npm run build` | Pass |

---

## 2. Database migrations (production Supabase)

Apply all migrations, then confirm remote parity:

```bash
npm run db:link    # once per machine
npm run db:push
npx supabase migration list
```

**Critical recent migrations** (spotlight, co-admin, broadcasts, YouTube, public covers):

| Migration | Purpose |
|-----------|---------|
| `20260520193000_admin_broadcasts.sql` | DJ communications audit log |
| `20260521110000_user_role_add_co_admin_enum.sql` | `co_admin` role enum |
| `20260521120000_co_admin_upload_role.sql` | Co-admin upload RLS + RPCs |
| `20260521130000_tracks_youtube_url.sql` | Optional YouTube URL on tracks |
| `20260531200000_editorial_spotlights.sql` | Editorial spotlights + hub RPCs |
| `20260601120000_editorial_spotlight_slots_extend.sql` | 3 extra editorial enum values |
| `20260601120001_editorial_spotlight_hub_extend.sql` | Hub RPC includes all 5 editorial slots |
| `20260602120000_public_editorial_spotlight_cover_storage.sql` | Anon cover read for editorial spotlights |

**Verify RPCs exist:**

```sql
select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'public_spotlight_hub',
    'public_spotlight_editorial',
    'public_spotlight_sponsored',
    'public_spotlight_leaderboard',
    'spotlight_track_card',
    'promos_object_is_active_editorial_spotlight_cover',
    'dj_catalog_feed',
    'admin_create_draft_track'
  )
order by proname;
```

**Verify tables:**

```sql
select tablename from pg_tables
where schemaname = 'public'
  and tablename in ('editorial_spotlights', 'admin_broadcasts');
```

---

## 3. Environment (Vercel / production)

Required for full launch behavior — see [ENV_DEPLOYMENT_CHECKLIST.md](./ENV_DEPLOYMENT_CHECKLIST.md).

| Variable | Why |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + RLS client |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks, notifications, **public spotlight cover signing** (algorithmic rows) |
| `NEXT_PUBLIC_SITE_URL` | Stripe return URLs, auth redirects |
| Stripe keys + webhook | Submissions + Featured Spotlight checkout |

---

## 4. Spotlight hub (code-verified behavior)

| Requirement | Status |
|-------------|--------|
| Admin assigns 5 editorial slots (`/admin/spotlights`) | Implemented |
| Home `/` shows hub when content exists | Implemented |
| `/featured` shows hub (logged out OK) | Implemented |
| DJ feed page 1 shows hub at top | Implemented |
| Paid **Featured Spotlight** separate from editorial | Implemented (`sponsored` section) |
| Algorithmic sections hidden until ≥3 items | Implemented |
| Empty DB → no crash (empty state / hide) | Implemented |
| Missing cover → placeholder, page renders | Implemented |
| Public editorial + featured cover Storage policies | Implemented (migrations above) |

---

## 5. DJ catalog (code-verified behavior)

| Requirement | Status |
|-------------|--------|
| Feedback + rating (stars, club ready, radio ready) required before download | Implemented |
| **Single ZIP** pack download (`/api/dj/tracks/[id]/pack`) | Implemented |
| Human-readable filenames inside ZIP | Implemented |

Manual smoke: [PHASE_4_5_DJ_CATALOG_SMOKE.md](./PHASE_4_5_DJ_CATALOG_SMOKE.md).

---

## 6. Production sign-off (manual — after deploy)

Complete [PRODUCTION_SMOKE_TEST_PLAN.md](./PRODUCTION_SMOKE_TEST_PLAN.md). Do **not** mark production GO until sections 1–5 and 8 pass.

| Result | When |
|--------|------|
| **Repo LAUNCH VERIFIED** | `npm run verify:launch` passes + migrations pushed |
| **Production GO** | Smoke plan signed off on live URL |

---

## 7. Known deferred (non-blockers)

- Play report `rejected` / `disputed` workflow (not in MVP UI)
- E2E / Playwright automation (manual smoke only)
- Hand-maintained `lib/types/database.ts` vs generated types
- Dead `createDraftTrack` server action (documented in [DEAD_CODE_AND_LEGACY_PATHS.md](./DEAD_CODE_AND_LEGACY_PATHS.md))

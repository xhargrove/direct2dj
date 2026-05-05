# Supabase generated types

## Why this matters

`lib/types/database.ts` is **hand-maintained**. It can **drift** from the live schema (new columns, RPC args, enum values), causing **silent** TypeScript lies or runtime surprises.

## Recommended workflow

1. Run **linked** or **local** Supabase with schema applied.
2. Generate types into a **separate** file first:

### Local (Docker / `supabase start`)

```bash
npm run types:supabase
```

This runs:

`supabase gen types typescript --local --schema public > lib/types/database.generated.ts`

(requires local Supabase running — see `npm run db:start`)

### Remote project

```bash
supabase gen types typescript --project-id <PROJECT_REF> --schema public > lib/types/database.generated.ts
```

Get `<PROJECT_REF>` from Supabase Dashboard → Project Settings → General.

## Current repo decision

- **Generated file:** `lib/types/database.generated.ts` — **not committed by default** until you run the script (add file when ready).
- **Existing imports:** Continue using `lib/types/database.ts` until you deliberately reconcile types and update imports per domain module.
- **CI recommendation:** After migrations on a branch, regenerate types and fail CI if `database.generated.ts` differs from committed snapshot (optional strictness).

## Comparing hand-written vs generated

```bash
diff -u lib/types/database.ts lib/types/database.generated.ts | head -100
```

Use generated types as **source of truth** for column names; merge carefully into hand types or replace incrementally.

## Caveat

**Do not** claim schema parity until generation matches **the same database** you deploy against.

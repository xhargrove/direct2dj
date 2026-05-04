# Local Supabase (Docker)

Use this flow when `seed.sql` / `npm run smoke:accounts` should hit **127.0.0.1**.

## Prerequisites

- **Docker Desktop** running (whale icon idle / healthy).
- Repo dependencies: run **`npm install`** once from the project root (no text after the command on the same line).

## Commands (run separately, one block at a time)

Do **not** paste lines that include `#` comments on the same line as `npm` / `npx`—some terminals or edited `package.json` scripts will pass extra tokens and break the Supabase CLI (`accepts at most 1 arg(s), received 7`). Do **not** put `# …` inside **`package.json`** `scripts` values.

```bash
npm install
```

```bash
npm run db:start
```

Wait until the CLI reports services are up. If you see `No such container: supabase_db_*`, the stack did not start—check Docker, then run `npm run db:start` again.

```bash
npm run db:reset
```

```bash
npm run db:status
```

Copy **`API URL`** and **`anon` / `publishable` key** into **`.env.local`** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Restart **`npm run dev`** after changing env.

```bash
npm run smoke:accounts
```

```bash
npm run dev
```

## Restore `package.json` scripts

Scripts must be **exactly** (no trailing `# …` in the string):

- `"db:status": "npx supabase status"`
- `"smoke:accounts": "npx supabase db query --local -f supabase/verify-smoke-data.sql -o table"`

If you merged instructions into `package.json`, reset those lines from git or copy from the repo’s `package.json`.

## See also

- `docs/SUPABASE_SMOKE_TESTS.md` — smoke users and password (local only).
- `docs/PHASE_4_5_DJ_CATALOG_SMOKE.md` — browser matrix.

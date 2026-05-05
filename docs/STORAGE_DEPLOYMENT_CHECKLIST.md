# Storage deployment checklist

## Bucket

| Bucket | Purpose |
|--------|---------|
| `promos` | Track audio, cover art, pack files (`track_files.storage_path`) |

## Policies (summary)

- Artists write under their **auth uid** path prefix (see migrations).
- DJs read objects tied to **catalog-visible** tracks (`track_is_visible_to_dj`).
- Admins have elevated read paths per migrations.
- **Anonymous** read for **cover_art** only when an **active featured** placement exists — requires migration `20260522120000_public_featured_catalog.sql` policy `promos_select_public_active_featured_cover`.

## Upload smoke (artist)

1. Sign in as artist with approved flow.
2. Open track edit; upload a pack slot file.
3. Confirm row in `track_files` and object visible in Dashboard → Storage.

## Signed URL smoke (server)

1. DJ or anon on `/featured`: cover images use **`createSignedUrl`** (`lib/dj/cover-sign.ts`).
2. **Production logs:** On failure, `[cover-sign]` warnings include **`bucket`**, **`pathTail`** (filename/slot segment only), **`message`**. Full storage paths are not logged.

## Fallback UI

- **`DjTrackCard`**: If no signed URL, shows **first two characters of title** in placeholder box — already user-visible fallback.

## Misconfiguration signals

| Signal | Meaning |
|--------|---------|
| Repeated `[cover-sign] createSignedUrl rejected` | RLS on `storage.objects`, missing policy, wrong bucket, or path not allowed for caller |
| Works for DJ, fails anon on `/featured` | Missing anon featured-cover policy migration |

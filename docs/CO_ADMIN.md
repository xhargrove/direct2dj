# Co-admin (upload-only Backstage)

A **co-admin** (`profiles.role = co_admin`) can use Backstage to upload DJ packs and verify files — without access to submissions, payments, DJ vetting, featured placements, or catalog approval.

## Grant access

Run in the Supabase SQL editor (replace email):

```sql
update public.profiles
set role = 'co_admin', updated_at = now()
where email = 'teammate@example.com';
```

Only an existing **full admin** can change roles (RLS guard). The user signs in with the same login flow; they land on **Tracks** after login.

## Migrations

Apply both:

- `20260521110000_user_role_add_co_admin_enum.sql`
- `20260521120000_co_admin_upload_role.sql`

Then redeploy the app.

## What co-admin can do

| Area | Access |
|------|--------|
| `/admin/dashboard` | Upload-focused dashboard |
| `/admin/tracks` | List tracks, open draft for upload |
| `/admin/tracks/new` | Quick house draft + draft for **existing** artist (no invite-new-artist form) |
| Track detail | Metadata, DJ pack uploader, file previews, **upload checklist** (cover + main audio) |

## What co-admin cannot do

- Approve/reject tracks, featured placements, catalog hide/show
- Submissions queue, payment reconciliation, system health
- Create artist accounts (invite), delete tracks, DJ/artist admin pages
- `/admin/tracks/.../analytics` (redirects to Tracks)

Route blocking is enforced in `proxy.ts` and server actions use `getAdminContext()` (full admin only) vs `getBackstageUploadContext()` (admin + co_admin).

## Revert to full admin

```sql
update public.profiles
set role = 'admin', updated_at = now()
where email = 'teammate@example.com';
```

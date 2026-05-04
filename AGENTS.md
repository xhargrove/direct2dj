<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Non-Negotiable Architecture Rules

- Do not create duplicate auth systems.
- Do not bypass Supabase RLS with client-side assumptions.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Do not create parallel track, file, download, rating, billing, or admin-review schemas.
- Extend the canonical migrations and existing domain modules only.
- All artist-owned data must remain scoped to the authenticated artist.
- DJs may only access catalog-visible tracks after vetting approval.
- Featured placements must only activate from verified Stripe webhook events.
- Private promo files must never be public bucket URLs.

## Core Lifecycles

Product-facing stages below. Implement by extending existing tables (`tracks`, `djs`, `featured_placements`, `payments`, `play_reports`) and migrations—do not add parallel state machines.

### Track lifecycle

`draft` → `submitted` → `approved` | `rejected` → `catalog_active` true/false

- **draft**: `tracks.is_draft = true` (incomplete pack / not yet submitted for review).
- **submitted**: `is_draft = false` and `moderation_status = 'pending'` (awaiting admin).
- **approved** | **rejected**: `tracks.moderation_status`; rejected rows may be edited and resubmitted per app rules.
- **catalog_active**: boolean on `tracks` when approved; admin can hide an approved track from the DJ catalog without changing moderation outcome.

### DJ lifecycle

`application_started` → `pending_review` → `approved` | `rejected` | `suspended`

- **application_started**: DJ has started or saved `dj_applications` (and has a `djs` row via profile sync).
- **pending_review**: `djs.vetting_status = 'pending'`.
- **approved** | **rejected** | **suspended**: `djs.vetting_status` (`dj_vetting_status` enum). Only **approved** DJs get full promo-pool / catalog access per RLS; **suspended** blocks promo actions.

### Featured placement lifecycle

`checkout_created` → `paid` → `active` → `expired` | `canceled`

- **checkout_created**: Stripe Checkout started; `payments` row (e.g. `pending`) linked to artist/track/plan.
- **paid**: `payments.status` moves to succeeded via **verified Stripe webhook**; placement row is created/linked (`payment_id`, `activation_source = paid_checkout` where applicable).
- **active**: placement is approved for display in its window (`featured_placements.moderation_status`, `starts_at` / `ends_at`).
- **expired** | **canceled**: time window ended (`ends_at`) or payment/checkout **canceled** / failed / refunded per `payments` and app rules. (Admin comp placements use `activation_source = admin_comp`—still follow existing schema.)

### Play report lifecycle

`submitted` → `admin_verified` | `rejected` | `disputed`

- **submitted**: DJ-filed report; in the DB this is `play_reports.verification_status = 'self_reported'`.
- **admin_verified**: `verification_status = 'verified'`.
- **rejected** | **disputed**: product/process states for admin and DJ workflows. The current enum is only `self_reported` and `verified`; if you add explicit rejected/disputed states, do it with a **new migration** on `play_report_verification` (or a separate column), not a second table.

## Route contract

These paths are the product contract for role dashboards. **Do not add a second tree** (e.g. duplicate `/promo` or `/artist2`) for the same concerns.

### Artist

| Path | Purpose |
|------|---------|
| `/artist` | Entry: redirects to the artist dashboard (`/artist/dashboard`). |
| `/artist/tracks` | Track list and DJ pack management. |
| `/artist/tracks/new` | Create a new draft pack. |
| `/artist/tracks/[id]` | Track overview (status, files, links to edit). |
| `/artist/tracks/[id]/edit` | Pack upload, metadata, and submit for review. |
| `/artist/analytics` | Downloads, ratings, and artist-facing analytics. |
| `/artist/promote` | Featured placement entry (and plan selection). |
| `/artist/billing` | Stripe and billing touchpoints. |

**Also in app (not a duplicate role area):** `/artist/play-reports`, `/artist/tracks/[id]/analytics`, `/artist/promote/[trackId]`, etc.

### DJ

| Path | Purpose |
|------|---------|
| `/dj/apply` | DJ application. |
| `/dj/status` | Application / vetting status (redirects to `/dj/application-status`). |
| `/dj/feed` | Approved-DJ catalog feed. |
| `/dj/tracks/[id]` | Track detail, download, rate. |
| `/dj/downloads` | Download history. |
| `/dj/play-reports` | Submit and list play reports (`/dj/play-reports/new` for a new report). |
| `/dj/settings` | Profile, city, contact preferences. |

**Also in app:** `/dj/dashboard`, `/dj/history`, etc.

### Admin

| Path | Purpose |
|------|---------|
| `/admin` | Admin home (link hub / dashboard). |
| `/admin/submissions` | Submitted tracks for review. |
| `/admin/tracks` | Catalog and track management. |
| `/admin/djs` | DJ list. |
| `/admin/applications` | DJ application review (redirects to `/admin/dj-applications`). |
| `/admin/featured` | Featured placement management. |
| `/admin/play-reports` | Play report verification. |

**Also in app:** `/admin/dashboard`, `/admin/artists`, `/admin/artists/[id]`, `/admin/tracks/[id]`, `/admin/submissions/[id]`, etc.

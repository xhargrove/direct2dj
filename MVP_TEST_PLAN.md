# MVP manual test plan

Run these flows in **staging** before production launch. Mark pass/fail and note browser + role used.

## Auth & roles

| # | Case | Steps | Expected |
|---|------|-------|----------|
| A1 | Unauthenticated | Visit `/artist/dashboard`, `/dj/feed`, `/admin/dashboard` | Redirect to `/login` or role home |
| A2 | Wrong role | Login as DJ → open `/artist/tracks` | Redirect away from artist surface |
| A3 | Artist login | Login as artist → dashboard loads | OK |
| A4 | Admin login | Login as admin → admin nav works | OK |

## DJ vetting (middleware)

| # | Case | Steps | Expected |
|---|------|-------|----------|
| D1 | Pending DJ | Login pending DJ → hit `/dj/feed` | Redirect to `/dj/application-status` |
| D2 | Allowed paths | Pending DJ → `/dj/apply`, `/dj/settings` | Accessible |
| D3 | Approved DJ | Approved DJ → `/dj/feed` | Feed loads |

## Artist flows

| # | Case | Steps | Expected |
|---|------|-------|----------|
| AR1 | Draft track | Create draft, edit metadata | Saves |
| AR2 | Upload pack | Upload allowed MIME types only | Rejects bad types with message |
| AR3 | Submit for review | Submit when slots valid | Status pending |
| AR4 | Ownership | Tamper with another artist `track_id` in UI/API | Fails / no data |

## Admin moderation

| # | Case | Steps | Expected |
|---|------|-------|----------|
| AD1 | Approve/reject | Moderate track | Artist receives notification (if service role configured) |
| AD2 | Featured admin | Create placement window | Appears in admin featured table |

## DJ catalog & downloads

| # | Case | Steps | Expected |
|---|------|-------|----------|
| DJ1 | Feed | Approved DJ opens feed | Cards load; **featured strip excludes expired windows** |
| DJ2 | Download | Download pack | Row in downloads; artist notified |
| DJ3 | Rating/feedback | Submit rating + feedback | Artist notified |

## Featured billing

| # | Case | Steps | Expected |
|---|------|-------|----------|
| FP1 | Checkout | Complete test Stripe checkout | Placement active; sweep/cron can notify |
| FP2 | Webhook | Replay bad signature | 400 |
| FP3 | Expiry | After `ends_at`, DJ feed featured strip | Track no longer featured |

## Notifications

| # | Case | Steps | Expected |
|---|------|-------|----------|
| N1 | Bell | Artist/DJ header bell | Unread count; mark read works |
| N2 | Email | Configure Resend/SendGrid/Postmark | Email only when provider set |

## APIs

| # | Case | Steps | Expected |
|---|------|-------|----------|
| API1 | Cron | `GET /api/cron/notifications` without secret | 401 |
| API2 | DJ Monitor | POST without secret | 503/401 |
| API3 | Dev route | `GET /api/dev/supabase-auth` in production | 404 |

## Mobile / UX smoke

| # | Case | Steps | Expected |
|---|------|-------|----------|
| M1 | Narrow viewport | iPhone width simulator | Headers wrap; bell reachable |
| M2 | Forms | Submit invalid fields | Inline/server errors visible |

## Regression

- `npm run lint` — clean or documented exceptions
- `npm run typecheck`
- `npm run build`

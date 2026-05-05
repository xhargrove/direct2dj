# Dead code and legacy paths

## Canonical flows

| Concern | Canonical path |
|---------|----------------|
| New artist pack (UI) | Paid **submission checkout** → Stripe → `activateSubmissionFromCheckoutSession` |
| Featured placement (UI) | Stripe featured checkout → `activateFeaturedFromCheckoutSession` (featured branch) |
| Admin draft without fee | `admin_create_draft_track` RPC via `adminCreateFreeDraftTrack` |

## `createDraftTrack` (server action)

| Item | Status |
|------|--------|
| **Location** | `app/artist/tracks/actions.ts` |
| **Imports** | **None** elsewhere in the repo (grep) |
| **UI** | **Not called** by any page or component |
| **RPC** | `create_draft_track` still exists in DB for **authenticated artists** |
| **Classification** | **Dead in UI**; **legacy / optional** for future scripts or manual `rpc` use |

**Decision (this pass):** **Do not remove** the action or RPC without a dedicated migration and regression test. A **JSDoc** comment on the action points here.

## `create_draft_track` vs `admin_create_draft_track`

- **Artist RPC:** `create_draft_track` — tied to `auth.uid()` artist row.
- **Admin RPC:** `admin_create_draft_track` — `is_admin` only, any `artist_id`.

No duplicate **business** submission flow in two webhooks—checkout activation is **single** entrypoint.

## Compatibility shims

None identified as separate files; **activateFeaturedFromCheckoutSession** routing submission vs featured is **intentional branching**, not dead code.

## Safe to remove later

- `createDraftTrack` export **only after** confirming no external automation calls it, and optional migration to drop unused RPC if product policy allows.

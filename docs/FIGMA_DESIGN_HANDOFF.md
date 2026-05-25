# Digital Service Pack — Figma design handoff

**Audience:** Designers, Figma Make, and engineers merging tokens back into code.

---

## Repository vs Figma file (read this first)

These are **different systems**. Cursor Figma MCP does **not** read your Git repo when you call `get_design_context` — it reads the **Figma file key** you pass in.

| System | Correct for Digital Service Pack | What you have |
|--------|----------------------------------|---------------|
| **Git repo (production code)** | `https://github.com/xhargrove/direct2dj` | ✅ This workspace — package `digital-service-pack` |
| **Vercel project** | `direct2dj` → https://direct2dja.com | ✅ Linked to `main` |
| **Figma Make — DSP redesign** | `pU7DPNlSeo5tTZieZp5L0A` (“Recreate Design Element”) | ⚠️ Share with `xhargrove71@gmail.com` so MCP can read it |

**Rule:** Code changes always come from **`direct2dj`**. Figma is visual reference only — do not merge Make prototype source into this repo as production code.

**Verify you are on the right Git repo:**

```bash
git remote get-url origin   # → github.com/xhargrove/direct2dj.git
node -p "require('./package.json').name"   # → digital-service-pack
```

**Verify Figma MCP is pointed at the right file:**

```text
get_design_context  fileKey=pU7DPNlSeo5tTZieZp5L0A  nodeId=0:1
```

**Production:** https://direct2dja.com · https://direct2dj.vercel.app

---

## 1. What to design (and what not to)

### In scope

- Visual system: color, type, radius, elevation, atmosphere, imagery
- Component **appearance** inside existing layout regions
- Empty states, gate screens, banners, form chrome
- Marketing hero and feature tiles
- Light/dark token tables that map 1:1 to CSS custom properties

### Out of scope

- New routes, roles, or product flows
- Database / Supabase / Stripe logic
- Rewriting the Next.js app inside Figma as production code
- Moving major IA (keep nav items and page purposes as listed below)

**Handback to engineering:** token table + reference frames. Engineers update `app/globals.css` and existing React components — no parallel design system in code.

---

## 2. Recommended Figma file structure

Create or organize a **Design** file (`figma.com/design/...`) with these pages:

| Page | Contents |
|------|----------|
| **00 — Foundations** | Color variables (match CSS names), type scale, spacing, radii, shadows, grid |
| **01 — Components** | Buttons, cards, inputs, nav, sidebar, bell, tables, badges, banners |
| **02 — Marketing** | Home `/`, featured hub, login |
| **03 — DJ workspace** | Feed, track detail, dashboard, application flow, **access gates** |
| **04 — Artist workspace** | Dashboard, track list, pack editor, billing |
| **05 — Admin (Backstage)** | Sidebar shell, submissions, tracks, DJ applications, user outreach |
| **06 — Label rep** | Dashboard, roster, catalog (lower priority) |
| **99 — Reference** | Screenshots from production or localhost for parity checks |

**Repo reference (not in Figma):** native app icon master — [`design/app-icon-reference.png`](../design/app-icon-reference.png) (1024×1024). See [`design/README.md`](../design/README.md).

### Frame naming convention

```
[Role] / [Route] / [State] — [Viewport]
```

Examples:

- `DJ / feed / approved — desktop 1440`
- `DJ / workspace-gate / application-pending — desktop 1440`
- `Admin / tracks / default — desktop 1440`
- `Marketing / home / signed-out — mobile 390`

### Viewports

| Name | Width | Notes |
|------|-------|-------|
| Mobile | 390 | Primary small breakpoint (`sm` = 640px in code) |
| Desktop | 1440 | Admin sidebar + main content |
| Wide | 1920 | Optional marketing hero |

---

## 3. Design direction

- **Tone:** nightclub / booth / flyer energy — **not** generic SaaS gray
- **Atmosphere:** dim venue with controlled neon (cyan → violet → warm accent)
- **Typography:** readable body; display moments can be bold / tight tracking
- **Motion:** subtle hover and transitions only; respect reduced motion
- **Dark-first:** live app defaults to forced dark (`html.dark`); design dark mode as primary

---

## 4. Typography

| Role | Font | CSS / Tailwind |
|------|------|----------------|
| Body | Geist Sans | `--font-geist-sans`, default `body` |
| Mono | Geist Mono | `--font-geist-mono` |
| Display / brand | Syne | `--font-syne`, class `.dj-brand` |

Loaded in `app/layout.tsx`. In Figma, use **Geist** + **Syne** (or closest substitutes).

### Type scale (reference)

| Use | Size | Weight |
|-----|------|--------|
| Page title | 24px / 1.5rem | 600 |
| Section title | 18–20px | 600 |
| Body | 14–16px | 400 |
| Caption / meta | 12px | 400–500 |
| Eyebrow / kicker | 11px | 600, uppercase, wide tracking (`.dj-eyebrow`, `.dj-kicker-badge`) |

---

## 5. Color tokens (engineering contract)

**Source of truth in code:** `app/globals.css` → `:root` and `@theme inline`.

Design variables in Figma **must use these exact names** so engineers can paste values without renaming.

### Core (current production values)

| Token | Hex / value | Usage |
|-------|-------------|-------|
| `--background` | `#000000` | Page canvas |
| `--foreground` | `#f4f4fb` | Primary text |
| `--dj-accent` | `#38bdf8` | Cyan accent |
| `--dj-accent-2` | `#8b5cf6` | Violet accent |
| `--dj-accent-3` | `#fbbf24` | Warm accent |
| `--card` | `rgba(14, 11, 26, 0.88)` | Card surfaces |
| `--card-foreground` | `#f4f4fb` | Text on cards |
| `--muted` | `rgba(255, 255, 255, 0.07)` | Subtle fills |
| `--muted-foreground` | `#a8a3bf` | Secondary text |
| `--border` | `rgba(255, 255, 255, 0.1)` | Borders |
| `--input` | `rgba(255, 255, 255, 0.1)` | Input borders |
| `--ring` | `#8b5cf6` | Focus ring |
| `--primary` | `#f4f4fb` | Primary button fill (inverted) |
| `--primary-foreground` | `#09090b` | Text on primary |
| `--secondary` | `rgba(255, 255, 255, 0.08)` | Secondary surfaces |
| `--secondary-foreground` | `#f4f4fb` | Text on secondary |

### Zinc ramp (Tailwind utilities)

Mapped in `@theme inline` — used heavily as `text-zinc-400`, `border-zinc-800`, etc. If redesigning neutrals, specify **zinc-50 … zinc-950** or migrate utilities to semantic tokens (`muted`, `card`).

### Gradients (component-level, not variables)

Document as styles in Figma:

- **`.dj-glow-text`** — cyan → violet → gold text gradient (animated in prod)
- **`.dj-btn-primary`** — violet → indigo → cyan pill button
- **`.dj-card` border** — cyan / violet / pink border gradient overlay

---

## 6. Component library (map to code)

Build Figma components that mirror these **CSS classes** in `app/globals.css`:

| Figma component | Code class | Notes |
|-----------------|------------|-------|
| Button / Primary | `.dj-btn-primary` | Pill, gradient, glow shadow |
| Button / Ghost | `.dj-btn-ghost` | Outlined pill |
| Card / Glass | `.dj-card` | 20px radius, gradient border |
| Header / App | `.dj-header` | Blur, bottom border, logo + kicker |
| Sidebar / Admin | `.dj-sidebar` | Left nav, blur gradient |
| Footer | `.dj-footer` | Top border, muted bg |
| Nav link | `.dj-nav-link` | Muted → cyan on hover |
| Brand wordmark | `.dj-brand` | Syne, tight tracking |
| Hero glow title | `.dj-glow-text` | Marketing headlines |
| Feature tile | `.dj-feature-tile` | Home feature grid |
| Atmosphere | `.dj-atmosphere` | Fixed mesh / glow background |
| Eyebrow | `.dj-eyebrow` | Uppercase label |
| Kicker badge | `.dj-kicker-badge` | Small pill above titles |

### Shared shell components (React)

| Component | File | Used in |
|-----------|------|---------|
| App top nav | `components/shell/app-top-nav.tsx` | DJ, Artist layouts |
| Marketing header | `components/shell/marketing-site-header.tsx` | Home, login |
| Notification bell | `components/notifications/notification-bell.tsx` | All workspaces |
| Account access gate | `components/auth/account-access-gate.tsx` | DJ blocked states |
| DJ gate banner | `components/dj/dj-workspace-gate-banner.tsx` | Unapproved DJ strip |

### Logo

- **File:** `public/site-logo.png`
- **Alt:** “Digital Service Pack logo”
- **Header size:** ~40px height (`h-10`)

---

## 7. Layout shells

### Marketing (`/`)

```
[ MarketingSiteHeader: logo | nav | sign in ]
[ Atmosphere background — full viewport ]
[ Hero — headline, lede, CTAs ]
[ Spotlight hub / editorial section ]
[ Feature grid — 3 tiles ]
[ Footer ]
```

### DJ workspace (`/dj/*`)

```
[ AppTopNav — kicker: "DJ deck" | nav links | bell + sign out ]
[ Optional: DjWorkspaceGateBanner — pending / not started / rejected ]
[ Main content — max-width varies by page ]
[ Footer — Home link ]
```

**Nav (approved DJ):** Dashboard · Profile · Feed · Downloads · Play reports · History · Privacy  

**Nav (unapproved DJ):** Dashboard · Status · Apply · Profile · Privacy  

### Artist workspace (`/artist/*`)

Same top nav pattern; kicker **“Artist desk”** (or equivalent in code).

### Admin / Backstage (`/admin/*`)

```
[ Mobile: hamburger + sidebar drawer ]
[ Desktop: fixed left sidebar — dj-sidebar ]
[ Main: page title + content; tables are dense but readable ]
```

Full admin nav — see section 8.

---

## 8. Screen inventory (design priority)

### P0 — Must have in Figma

| Route | Purpose | Key UI |
|-------|---------|--------|
| `/` | Marketing home | Hero, CTAs, spotlight, features |
| `/login` | Auth | Email magic link / OAuth form |
| `/dj/feed` | DJ catalog | Track cards, filters bar |
| `/dj/tracks/[id]` | Track detail | Pack info, rating, download |
| `/dj/application-status` | Vetting status | Status dl, crew roster, CTAs |
| `/dj/apply` | DJ application | Long form, validation states |
| `/artist/dashboard` | Artist hub | Stats, quick links |
| `/artist/tracks` | Track list | Status badges, actions |
| `/artist/tracks/[id]/edit` | Pack upload | Slot uploader rows |
| `/admin/dashboard` | Admin hub | Count cards |
| `/admin/tracks` | Catalog admin | Sidebar + track table |
| `/admin/dj-applications` | DJ vetting | Row actions, approve/reject |
| `/admin/user-outreach` | Email users | Templates, audience radios |

### P1 — Access gates & edge states (DJ)

Design **one frame each** — copy is fixed in product:

| State | Title | Primary CTA |
|-------|-------|-------------|
| Signed out | Please sign in to continue | Sign in → `/login` |
| No profile | Account setup is incomplete | Continue → `/onboarding` |
| Artist on DJ area | This account is registered as an artist | Continue → `/dj/apply` |
| Application not started | Your DJ application is not complete yet | Continue → `/dj/apply` |
| Application pending | Your DJ application is under review | Check status → `/dj/application-status` |
| Application rejected | Your DJ application was not approved | Continue → `/support` |

**Component:** `AccountAccessGate` — centered card, title + body + single primary button.

**Banner variant:** `DjWorkspaceGateBanner` — full-width strip under nav (same copy, compact).

### P2 — Supporting screens

| Route | Notes |
|-------|-------|
| `/dj/dashboard` | Summary for approved / pending |
| `/dj/downloads` | History list |
| `/dj/play-reports` | List + `/new` form |
| `/dj/settings` | Privacy toggles |
| `/artist/billing` | Stripe cards |
| `/artist/promote` | Featured checkout |
| `/admin/submissions` | Pending track queue |
| `/admin/tracks/[id]` | Review + pack QA + delete |
| `/featured` | Public featured catalog |
| `/support` | Static support |
| `/onboarding` | Incomplete profile |

### P3 — Label rep

`/label/dashboard`, `/label/roster`, `/label/catalog`

---

## 9. Admin navigation (full)

From `lib/admin/nav.ts` — **do not rename** without product sign-off:

Dashboard · Submissions · Payments · Tracks · New DJ pack · Spotlights · Featured · Artists · DJs · User outreach · DJ messages · DJ activity · DJ applications · DJ organizations · Play reports · System

Co-admin subset: Dashboard · Tracks · New DJ pack

---

## 10. Key product flows (for flow diagrams)

1. **Artist:** sign up → upload pack → submit → admin approves → DJ sees in feed  
2. **DJ:** sign up → apply → pending → admin approves → feed + downloads unlock  
3. **DJ rating gate:** download locked until stars + Club Ready + Radio Ready submitted  
4. **Featured:** artist checkout (Stripe) → webhook → placement active  
5. **Admin outreach:** pick audience → send → in-app bell + optional email  

---

## 11. Figma Make / MCP

### Canonical Make file (Digital Service Pack — use this)

| | |
|--|--|
| **Name** | Recreate Design Element |
| **URL** | https://www.figma.com/make/pU7DPNlSeo5tTZieZp5L0A/Recreate-Design-Element |
| **File key** | `pU7DPNlSeo5tTZieZp5L0A` |
| **MCP node** | `0:1` |
| **Access** | ⚠️ Not readable until shared with `xhargrove71@gmail.com` (or duplicated into a new DSP Make file) |

This is the file for **this product’s** visual redesign. All Make prompts and MCP reads should target this key.

Engineering merges token proposals into **`app/globals.css`** (section 5) — do not copy Make `theme.css` verbatim.

### Cursor Figma MCP

```text
get_design_context  fileKey=pU7DPNlSeo5tTZieZp5L0A  nodeId=0:1
```

Returns Make source files — reference only; does **not** auto-sync to Git.

### Copy-paste prompt (Figma Make — DSP file `pU7DPNlSeo5tTZieZp5L0A`)

> Redesign the **visual system only** for **Digital Service Pack** — a DJ promo platform. Aesthetic: **nightclub / booth / flyer**, not corporate SaaS. Keep **layout skeleton** (header, main, cards). Output: **(1)** color tokens named `--background`, `--foreground`, `--dj-accent`, `--dj-accent-2`, `--dj-accent-3`, `--card`, `--muted`, `--border`, `--primary`; **(2)** frames for home, DJ feed, login, DJ application-status, admin tracks with sidebar. Do not invent new features.

---

## 12. Engineering merge checklist

After design sign-off:

1. Export token table (Figma variables → CSV or spec table)
2. Update `:root` in `app/globals.css`; adjust `@theme inline` if zinc ramp changes
3. Spot-check routes using raw `bg-white` / `slate-*` / hardcoded hex
4. Compare P0 frames to production at 1440 and 390
5. Run `npm run verify:launch`

---

## 13. Reference links

| Doc | Purpose |
|-----|---------|
| `AGENTS.md` | Route contract, lifecycles, architecture rules |
| `docs/FIGMA_MAKE_REDESIGN_HANDOFF.md` | Short Make-focused prompt |
| `docs/SUPABASE_DJ_ACCESS_SMOKE_TEST.md` | DJ access states QA |
| `app/globals.css` | Live tokens + component classes |
| `lib/auth/account-access-copy.ts` | Gate screen copy (do not change in design without product) |

---

## 14. Contact

Design files stay in Figma (not required in Git). Link the canonical Design file URL in the GitHub issue or PR when opening a visual refresh.

**Suggested canonical file name:** `Digital Service Pack — Product UI`

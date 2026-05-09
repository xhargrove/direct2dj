# Figma Make — visual redesign handoff

Use this doc when prompting **Figma Make** or briefing a designer. Goal: **skin and atmosphere** that feel **DJ / booth / nightlife**, not corporate SaaS. **Do not redesign information architecture** unless product explicitly expands scope.

---

## Product

**Digital Service Pack** — promos from artists and labels to **DJs**: discovery, DJ pack downloads, play reporting, billing for featured placements. Roles: **artist**, **DJ**, **label rep**, **admin**.

Canonical site (confirm in deploy env): **https://digitalservicepack.com**

---

## Design direction

- **Tone:** club flyer, booth energy, confident type — **not** neutral gray dashboards or “enterprise” cards.
- **Typography:** display moments can be bold / tight tracking; body stays readable (Geist Sans in product; Syne available for display via `.dj-brand`).
- **Color:** lean on **cyan → violet → hot accent** (see token names below). Dark mode should feel like a **dim venue** with controlled neon, not flat `#111`.
- **Motion:** subtle only (hover, small transitions). Respect reduced motion.

---

## Scope (what Make should change)

| In scope | Out of scope |
|----------|----------------|
| Color, type scale, radius, elevation, imagery style, empty states, marketing hero | New routes, new roles, new data models, RLS, Stripe flows |
| Figma variables / styles that map to **CSS custom properties** | Rewriting the Next.js app inside Make as production code |
| Component **appearance** inside existing layout regions | Moving major sections, merging unrelated flows |

**Handback to engineering:** deliver **token values** (hex/oklch + names) and **reference frames** — engineers merge into `app/globals.css` and existing components.

---

## Figma Make file (this project)

| | |
|--|--|
| **Make URL** | `https://www.figma.com/make/y0txXZyFfbVK66idEaf3lI/User-greeting` |
| **File key** | `y0txXZyFfbVK66idEaf3lI` |

Cursor **Figma MCP** can read this file with `fileKey: "y0txXZyFfbVK66idEaf3lI"`. It does **not** auto-push designs into the Git repo.

---

## Engineering token contract (`app/globals.css`)

These **`:root`** custom properties drive the live app (light defaults; **`prefers-color-scheme: dark`** overrides the same names). Make should output a **table** of proposed values per mode.

**Core**

- `--background`, `--foreground`
- `--dj-accent`, `--dj-accent-2`, `--dj-accent-3`

**Semantic (shadcn-style aliases in repo)**

- `--card`, `--card-foreground`
- `--muted`, `--muted-foreground`
- `--border`, `--input`, `--ring`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`

**Tailwind v4 `@theme`**

Maps to utilities: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, etc. The **`zinc`** scale is **remapped** in theme to booth-tinted neutrals — if Make proposes a new neutral ramp, specify **zinc-50 … zinc-950** or recommend switching utilities to `muted` / `card`.

**Marketing / shell utilities** (see `app/globals.css` `@layer components`)

Examples: `.dj-brand`, `.dj-glow-text`, `.dj-lede`, `.dj-header`, `.dj-footer`, `.dj-btn-primary`, `.dj-btn-ghost`, `.dj-card`, `.dj-atmosphere`, `.dj-feature-tile` — restyle in Figma **by name** so engineers can align CSS once.

---

## Priority surfaces (reference in Make)

Mirror **structure**, restyle **chrome**:

1. **Marketing home** — `/` (hero, CTAs, feature grid).
2. **DJ** — `/dj/feed`, `/dj/tracks/[id]`, `/dj/dashboard`, `/dj/settings`.
3. **Artist** — `/artist/dashboard`, `/artist/tracks`, pack editor chrome.
4. **Auth** — `/login`.
5. **Admin** (optional pass) — `/admin/dashboard`, list/review tables (keep density readable).

Full route contract: `AGENTS.md` in repo (Artist / DJ / Label / Admin tables).

---

## Stack (for realism in Make)

- **Next.js** (App Router), **React**, **Tailwind CSS v4** (`@import "tailwindcss"` + `@theme inline` in `app/globals.css`).
- UI patterns: many screens use **Tailwind `zinc-*`** classes; neutrals are theme-tinted in code.

---

## Copy-paste prompt starter (Figma Make)

Adapt as needed:

> Redesign the **visual system only** (colors, typography, radii, shadows, marketing hero) for **Digital Service Pack** — a DJ promo platform. Aesthetic: **nightclub / booth / flyer**, not corporate SaaS. Keep **layout skeleton** the same (header, main, cards in place). Output: **(1)** light and dark **color tokens** with names matching CSS: `--background`, `--foreground`, `--dj-accent`, `--dj-accent-2`, `--dj-accent-3`, `--card`, `--muted`, `--border`, `--primary`; **(2)** optional **zinc-50–950** ramp; **(3)** key screens: marketing home, DJ feed, login. Do not invent new product features.

---

## After Make: engineering checklist

1. Paste token table into a PR description or issue.
2. Update `:root` and `@media (prefers-color-scheme: dark)` in `app/globals.css`; adjust `@theme inline` if zinc ramp changes.
3. Spot-check `bg-white` / `slate-*` / raw hex on high-traffic routes.
4. Run `npm run lint` and `npm run build`.

---

## Contact / repo

Source: **direct2dj** monorepo (private). Design files are **not** required to live in Git; link Make or Design files in the issue when opening a redesign PR.

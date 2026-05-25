# Figma ↔ repo linkage

Quick reference so design tools and Git stay aligned for **Digital Service Pack**.

## Correct production repo

| Check | Expected |
|-------|----------|
| Git remote | `https://github.com/xhargrove/direct2dj.git` |
| npm package | `digital-service-pack` |
| Vercel project | `direct2dj` |
| Production URL | https://direct2dja.com |
| Route contract | `AGENTS.md` in repo root |

## Figma Design file (Digital Service Pack)

| File | Key | MCP status |
|------|-----|------------|
| [Digital Service Pack — Design](https://www.figma.com/design/oLrrwfAVeBv5GuFk0XR8PC) | `oLrrwfAVeBv5GuFk0XR8PC` | ✅ Owned by `xhargrove71@gmail.com` — MCP readable |

Legacy Make file (optional reference): [Recreate Design Element](https://www.figma.com/make/pU7DPNlSeo5tTZieZp5L0A/Recreate-Design-Element) — key `pU7DPNlSeo5tTZieZp5L0A` (share required).

## What `get_design_context` does

- Reads **Figma Make source** for the given `fileKey`
- Does **not** read `direct2dj` from GitHub
- Does **not** auto-sync into the Next.js app

## MCP command

```text
get_design_context  fileKey=oLrrwfAVeBv5GuFk0XR8PC  nodeId=0:1
```

## Full handoff

See [`FIGMA_DESIGN_HANDOFF.md`](./FIGMA_DESIGN_HANDOFF.md).

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

## Figma Make file (Digital Service Pack)

| File | Key | MCP status |
|------|-----|------------|
| [Recreate Design Element](https://www.figma.com/make/pU7DPNlSeo5tTZieZp5L0A/Recreate-Design-Element) | `pU7DPNlSeo5tTZieZp5L0A` | Share with `xhargrove71@gmail.com` to enable MCP reads |

## What `get_design_context` does

- Reads **Figma Make source** for the given `fileKey`
- Does **not** read `direct2dj` from GitHub
- Does **not** auto-sync into the Next.js app

## MCP command

```text
get_design_context  fileKey=pU7DPNlSeo5tTZieZp5L0A  nodeId=0:1
```

## Full handoff

See [`FIGMA_DESIGN_HANDOFF.md`](./FIGMA_DESIGN_HANDOFF.md).

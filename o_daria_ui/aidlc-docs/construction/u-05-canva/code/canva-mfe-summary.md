# Code Summary — U-05: mfe-canva

**Unit**: U-05 mfe-canva  
**Port**: 3004  
**MF exposes**: `./CanvaPanel`  
**Status**: COMPLETED

---

## Files Generated

| File | Purpose |
|---|---|
| `apps/mfe-canva/src/CanvaPanel.tsx` | Main component — shows generate button, progress, and Canva link |
| `apps/mfe-canva/src/hooks/useCanvaGeneration.ts` | Sequential two-step mutation: `POST /canva/setup` → `POST /canva/generate` |
| `apps/mfe-canva/src/mocks/handlers.ts` | MSW handlers for standalone dev (POST setup + generate) |
| `apps/mfe-canva/src/mocks/browser.ts` | MSW worker setup |
| `apps/mfe-canva/src/main.tsx` | Standalone dev entry — starts MSW, mounts CanvaPanel in reportReady state |

## Key Design Decisions

- **Two-step generation**: Step 1 `POST /canva/setup` obtains a `sessionToken`; Step 2 `POST /canva/generate` uses it to produce the `canvaLink`. Both are sequential mutations inside `useCanvaGeneration`.
- **Locked until report ready**: `CanvaPanel` renders a disabled placeholder when `reportReady=false` — prevents premature Canva generation.
- **Idempotent UI**: `existingCanvaLink` prop allows the panel to display a previously generated link without re-generating.

## Standalone Dev

Run `pnpm dev` inside `apps/mfe-canva/` — MSW intercepts both Canva endpoints and returns mock session token and link.

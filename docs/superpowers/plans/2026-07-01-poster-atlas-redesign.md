# System Map Redesign Implementation Plan

> **Status:** Completed on `feat/atlas-foundation` in the system-map redesign pass.

**Goal:** Replace the poster-card wall with a connected AI compute system map while preserving node/company drawers and shareable state.

**Architecture:** `AtlasApp` derives one full-canvas node list from the validated snapshot and passes all industry edges into `PosterAtlasCanvas`. `PosterAtlasCanvas` renders material input lanes, the central AI compute chain, manufacturing-enablement lanes, and visible connection explanations. Header search remains; relationship mode controls are removed from the UI while legacy `mode` query parsing remains compatible.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, Zod fixtures, Vitest, Testing Library, Playwright.

---

### Task 1: Lock system-map behavior with tests

**Files:**
- Modify: `tests/atlas-app.test.tsx`
- Modify: `tests/e2e/atlas.spec.ts`

- [x] Assert the layer navigation is gone.
- [x] Assert the relationship mode group is gone.
- [x] Assert the H1 is `AI 算力系统连接图谱`.
- [x] Assert the page contains `材料输入层`, `制造使能层`, and `AI 算力主链路`.
- [x] Assert visible connection explanations include material input and equipment enablement examples.
- [x] Update mobile E2E to verify the system map and CPO bottom sheet.

### Task 2: Implement system-map canvas

**Files:**
- Modify: `components/atlas/poster-atlas-canvas.tsx`
- Modify: `components/atlas/atlas-app.tsx`
- Modify: `components/atlas/atlas-header.tsx`
- Modify: `app/globals.css`

- [x] Remove relationship mode controls from the header.
- [x] Pass all validated industry edges to the canvas instead of mode-filtered edges.
- [x] Render material input lanes.
- [x] Render the central AI compute chain.
- [x] Render manufacturing enablement lanes as explanatory, non-clickable cards.
- [x] Keep real nodes clickable with stable `data-testid="node-${id}"`.
- [x] Render visible connection explanation cards and accessible relation summaries.

### Task 3: Verify

- [x] `npm test -- tests/atlas-app.test.tsx`
- [x] `npm test`
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm run test:e2e`
- [x] Desktop screenshot
- [x] Mobile screenshot
- [x] CPO drawer interaction and console check
- [ ] `git diff --check`
- [ ] Commit

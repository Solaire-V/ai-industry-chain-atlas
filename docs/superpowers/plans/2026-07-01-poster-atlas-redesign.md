# Poster Atlas Redesign Implementation Plan

> **Status:** Completed on `feat/atlas-foundation` in the poster redesign pass.

**Goal:** Replace the layer-sidebar relationship view with a full AI compute industry-chain poster canvas while preserving node/company drawers and shareable state.

**Architecture:** `AtlasApp` will derive one full-canvas node list instead of layer-scoped nodes. A new `PosterAtlasCanvas` component renders grouped poster sections, cards, and relation arrows from the existing validated snapshot. Header controls remain code-native; details continue through existing drawers.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, Zod fixtures, Vitest, Testing Library, Playwright.

---

### Task 1: Lock the poster behavior with component tests

**Files:**
- Modify: `tests/atlas-app.test.tsx`

- [x] **Step 1: Write failing tests**

Add tests asserting:

```ts
expect(screen.queryByRole("navigation", { name: "产业层级" })).not.toBeInTheDocument();
expect(screen.getByRole("heading", { name: "AI 算力产业链全景图谱" })).toBeInTheDocument();
expect(screen.getByText("上游基础材料")).toBeInTheDocument();
expect(screen.getByText("高速互联与 CPO")).toBeInTheDocument();
expect(screen.getByTestId("node-cpo")).toBeInTheDocument();
```

Update search and focus tests so they expect unmatched nodes to disappear from the full poster, not just the selected layer.

- [x] **Step 2: Run the test**

Run: `npm test -- tests/atlas-app.test.tsx`

Expected: fail because `LayerNav` is still rendered and the poster heading does not exist.

### Task 2: Implement the poster canvas

**Files:**
- Create: `components/atlas/poster-atlas-canvas.tsx`
- Modify: `components/atlas/atlas-app.tsx`
- Modify: `components/atlas/atlas-header.tsx`
- Modify: `app/globals.css`

- [x] **Step 1: Create `PosterAtlasCanvas`**

Render grouped sections from the existing `AtlasSnapshot`:

- section heading;
- node cards with `data-testid="node-${id}"`;
- representative companies from `companyIds`;
- selected and related states;
- accessible hidden relation summaries.

- [x] **Step 2: Replace `LayerNav` usage**

Remove `LayerNav` from `AtlasApp` render path. Keep query parsing untouched for compatibility, but derive `posterNodes` from all snapshot nodes and search filters.

- [x] **Step 3: Restyle app**

Change global layout from two-column dark dashboard to warm poster surface. Preserve drawer behavior and mobile bottom sheet.

- [x] **Step 4: Run component tests**

Run: `npm test -- tests/atlas-app.test.tsx`

Expected: pass.

### Task 3: Update browser/E2E coverage

**Files:**
- Modify: `tests/e2e/atlas.spec.ts`

- [x] **Step 1: Update mobile test**

Remove layer filter assertions. Assert mobile opens CPO from the poster canvas and the drawer is visible.

- [x] **Step 2: Run E2E**

Run: `npm run test:e2e`

Expected: desktop and mobile tests pass.

### Task 4: Verify and commit

**Files:**
- Modify as above.

- [x] **Step 1: Run final checks**

Run:

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
git diff --check
```

- [x] **Step 2: Browser QA**

Check desktop and `390×844` mobile. Confirm no left sidebar, poster heading visible, CPO card clickable, company drawer still works, no console errors.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: redesign atlas as full industry poster"
```

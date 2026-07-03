# Atlas Data Display Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix data/display clarity issues in the AI industry atlas without redesigning the main canvas.

**Architecture:** Keep the current single workbench component structure. Add `view` to URL query state, derive cross-stage reuse from existing `realNodeId` references, and improve node-library/status copy without changing backend schema.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library.

---

### Task 1: Query-state view routing

**Files:**
- Modify: `lib/atlas/query-state.ts`
- Modify: `components/atlas/atlas-app.tsx`
- Modify: `components/atlas/three-layer-atlas-canvas.tsx`
- Test: `tests/query-state.test.ts`
- Test: `tests/atlas-app.test.tsx`

- [ ] Add an `AtlasWorkspaceView` union and `view` field to `AtlasQueryState`.
- [ ] Parse invalid or missing `view` as `canvas`.
- [ ] Serialize `view` as the first query param.
- [ ] Make `ThreeLayerAtlasCanvas` controlled by `activeView` and `onChangeView`.
- [ ] Update directory button clicks to update URL.
- [ ] Add tests for `?view=nodes&stage=equipment` deep linking and navigation URL changes.

### Task 2: Duplicate display-name guard

**Files:**
- Modify: `lib/atlas/stage-map.ts`
- Test: `tests/stage-map.test.ts`
- Test: `tests/atlas-app.test.tsx`

- [ ] Add a stage-map test requiring unique subnode labels within each stage.
- [ ] Rename equipment `高速测试` labels into chip/device testing and optical/CPO testing.
- [ ] Add component coverage that equipment node library no longer has duplicate `高速测试` cards.

### Task 3: Cross-stage reuse display

**Files:**
- Modify: `components/atlas/three-layer-atlas-canvas.tsx`
- Modify: `app/globals.css`
- Test: `tests/atlas-app.test.tsx`

- [ ] Derive all stage appearances for each `realNodeId` from `atlasStages`.
- [ ] Add a `跨阶段` badge on node-library cards with reused real nodes.
- [ ] Add a detail section listing reuse positions for reused nodes.
- [ ] Test `低损耗 CCL` and `AI 集群` reuse indicators.

### Task 4: Data completeness and placeholder clarity

**Files:**
- Modify: `components/atlas/three-layer-atlas-canvas.tsx`
- Modify: `app/globals.css`
- Test: `tests/atlas-app.test.tsx`

- [ ] Show `待补` count per selected node-library stage.
- [ ] Replace ambiguous `0 个可投资` copy with `待补投资节点` where mapped count is zero.
- [ ] Make markets page explicitly show `行情源未接入`.
- [ ] Make supply page distinguish industry edges from company-level supply relations.

### Task 5: Verification

**Files:**
- No code files.

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Browser-check the main canvas, `?view=nodes&stage=equipment`, markets, and supply pages.

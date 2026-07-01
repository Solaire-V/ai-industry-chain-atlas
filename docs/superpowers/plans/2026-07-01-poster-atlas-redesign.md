# Modular Atlas Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Subagent execution is intentionally not used because the current user asked us to continue in this session and the developer instruction says not to spawn subagents unless explicitly requested.

**Goal:** Replace the single dense system map with a modular AI compute-chain atlas that shows module-to-module relationships first and lets users expand each module into internal nodes.

**Architecture:** Add a UI-only module map model under `lib/atlas` for module cards, subnode groups, and structured connection text. `PosterAtlasCanvas` consumes that model plus validated snapshot nodes, renders a low-density module overview, and expands one selected module into an internal graph. Existing node/company drawers remain unchanged and are only opened for real `AtlasSnapshot` nodes.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, Zod fixtures, Vitest, Testing Library, Playwright.

---

### Task 1: Lock modular atlas behavior with tests

**Files:**
- Modify: `tests/atlas-app.test.tsx`
- Modify: `tests/e2e/atlas.spec.ts`

- [ ] **Step 1: Write failing unit tests**

Add assertions that:

- the page heading is `AI 算力模块化地图`;
- the page exposes `模块总览`;
- the page has module buttons for `半导体材料`, `半导体设备`, `光通信 / CPO`;
- `关系模式` and `产业层级` controls remain absent;
- clicking `半导体材料` reveals `硅片`, `SOI`, `InP 衬底`, `光刻胶`, `电子特气`, `CMP 抛光液`, `ABF 载板材料`, `低损耗 CCL`, `光纤预制棒`;
- clicking `半导体设备` reveals `前道设备`, `光刻`, `刻蚀`, `薄膜沉积`, `封装 / 测试设备`;
- structured connection text includes `半导体材料 → AI 芯片 / 存储`, `半导体设备 ⇢ 光通信 / CPO`, and `光通信 / CPO → 服务器 / 网络 / AIDC / 应用`;
- clicking real node `node-cpo` still opens the existing node drawer.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/atlas-app.test.tsx`

Expected: FAIL because the new module heading, module buttons, expanded material subnodes, and structured module connection labels do not exist yet.

- [ ] **Step 3: Update E2E expectations**

Modify mobile E2E to assert:

- heading `AI 算力模块化地图`;
- module button `半导体材料`;
- tap `半导体材料`;
- material subnode `光刻胶` becomes visible;
- tap `光通信 / CPO`;
- real node `node-cpo` is still clickable and opens the drawer.

### Task 2: Add module-map model

**Files:**
- Create: `lib/atlas/module-map.ts`

- [ ] **Step 1: Define module IDs, subnodes, groups, and edges**

Create a UI-only model with:

- `atlasModules`: seven modules;
- `moduleConnections`: module-to-module edges with `flow` or `enable` kind;
- material groups split down to smallest nodes;
- equipment groups split into front-end, packaging/test, PCB manufacturing, optical/CPO equipment;
- real node references for existing snapshot nodes such as `cpo`, `optical-engine`, `pluggable-optics`, `hbm`, `high-layer-pcb`;
- virtual subnodes for fine-grained items not yet backed by company/source evidence.

- [ ] **Step 2: Export helper maps**

Export `defaultModuleId`, `atlasModuleById`, and type aliases so the canvas can render without recomputing static data on each render.

### Task 3: Implement modular canvas

**Files:**
- Modify: `components/atlas/poster-atlas-canvas.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace dense layers with module overview**

Render:

- heading `AI 算力模块化地图`;
- short explanation that the first layer is overview and expanded modules show internal nodes;
- module buttons with input/output summaries;
- visible module connection cards generated from `moduleConnections`.

- [ ] **Step 2: Add expanded module panel**

Use local React state for selected module. Default to `materials`. Clicking a module updates selected state and scroll position remains in page.

The expanded module panel renders:

- module role;
- grouped internal subnodes;
- virtual subnode chips for smallest items;
- real clickable node cards for existing snapshot nodes;
- internal connection list generated from selected module data.

- [ ] **Step 3: Preserve existing real-node behavior**

Existing `NodeButton` keeps:

- `id="atlas-node-${node.id}"`;
- `data-testid="node-${node.id}"`;
- `aria-pressed`;
- `data-related`;
- click handler opening the drawer.

### Task 4: Responsive styling

**Files:**
- Modify: `app/globals.css`

- [ ] Style the overview as a low-density module map.
- [ ] Style module buttons with clear selected state.
- [ ] Style module connections as structured flow and dashed enablement rows.
- [ ] Style expanded module groups as readable chips/cards.
- [ ] On mobile, stack module buttons vertically and keep expanded internal map readable without tiny text.

### Task 5: Verify

- [ ] `npm test -- tests/atlas-app.test.tsx`
- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] Browser/Playwright desktop screenshot
- [ ] Browser/Playwright mobile screenshot
- [ ] Browser/Playwright CPO drawer interaction and console check
- [ ] `git diff --check`
- [ ] Commit

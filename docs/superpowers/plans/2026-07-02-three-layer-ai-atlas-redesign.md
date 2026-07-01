# Three-Layer AI Atlas Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current modular atlas screen with a desktop-first three-layer AI industry-chain map: 9-stage main chain, selected-stage internal diagram, and structured data layer for future company/market/supply data.

**Architecture:** Move the screen from `module-map` and `PosterAtlasCanvas` to a stage-first model. `lib/atlas/stage-map.ts` becomes the source of truth for the 9 stages, their internal diagrams, subnodes, and main-chain connections; focused React components render the main chain, stage diagram, and data layer from that model. Existing node/company drawers, market placeholders, search input, and legacy `layer`/`mode` query compatibility remain intact.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS modules via `app/globals.css`, Zod data schemas, Vitest + Testing Library, Playwright.

---

## Scope Check

The approved spec is one UI/data-model redesign for the atlas screen. It includes future hooks for company metrics and supply relationships, but this plan does not implement live market-data providers, company-pool expansion, or evidence ingestion. Those remain separate future iterations.

## File Structure

- Create `lib/atlas/stage-map.ts`
  - Owns `AtlasStage`, `StageDiagram`, `StageGroup`, `StageSubnode`, `StageConnection`, `MainChainConnection`.
  - Exports `atlasStages`, `atlasStageById`, `defaultStageId`, `mainChainConnections`, `getStageIdForNode`, `getStageRealNodeIds`, `findStageBySearch`.
- Delete `lib/atlas/module-map.ts` after the UI no longer imports it.
- Modify `lib/atlas/query-state.ts`
  - Adds `stage` query support while preserving legacy `layer` and `mode`.
- Create `components/atlas/stage-node-button.tsx`
  - Shared clickable representation for real `AtlasNode` entries inside stage diagrams and search results.
- Create `components/atlas/stage-chain.tsx`
  - Renders the 9-stage main chain and main-chain connections.
- Create `components/atlas/stage-detail.tsx`
  - Renders the selected stage complete internal diagram from stage-map data.
- Create `components/atlas/stage-data-layer.tsx`
  - Renders minimum subnodes, real node buttons, and future company/market/supply placeholders.
- Create `components/atlas/three-layer-atlas-canvas.tsx`
  - Orchestrates stage selection, search result presentation, selected-node relationship highlighting, empty state, and hidden relationship summary.
- Delete `components/atlas/poster-atlas-canvas.tsx` after migration.
- Modify `components/atlas/atlas-app.tsx`
  - Uses `ThreeLayerAtlasCanvas`.
  - Keeps node/company drawer behavior.
  - Stores selected stage in URL query.
- Modify `app/globals.css`
  - Adds `.three-layer-*`, `.stage-*`, and `.data-layer-*` styles.
  - Removes stale `.module-*` selectors only after the new components pass tests.
- Modify tests:
  - `tests/stage-map.test.ts` new.
  - `tests/query-state.test.ts` update.
  - `tests/atlas-app.test.tsx` update.
  - `tests/e2e/atlas.spec.ts` update.

## Verification Commands

Use these commands throughout:

```bash
npm run test -- tests/stage-map.test.ts
npm run test -- tests/query-state.test.ts
npm run test -- tests/atlas-app.test.tsx
npm run typecheck
npm run build
npm run test:e2e
```

---

### Task 1: Create the 9-stage source of truth

**Files:**
- Create: `tests/stage-map.test.ts`
- Create: `lib/atlas/stage-map.ts`
- Later delete: `lib/atlas/module-map.ts`

- [ ] **Step 1: Write failing stage-map tests**

Create `tests/stage-map.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  atlasStageById,
  atlasStages,
  defaultStageId,
  findStageBySearch,
  getStageIdForNode,
  getStageRealNodeIds,
  mainChainConnections,
} from "@/lib/atlas/stage-map";

describe("stage-map", () => {
  it("defines the approved 9-stage AI industry chain", () => {
    expect(atlasStages.map(({ id }) => id)).toEqual([
      "materials",
      "equipment",
      "ai-chip",
      "hbm-memory",
      "advanced-packaging",
      "board-system",
      "optical-interconnect",
      "server-network",
      "compute-applications",
    ]);
    expect(defaultStageId).toBe("optical-interconnect");
    expect(atlasStages.map(({ name }) => name)).toEqual([
      "材料",
      "设备",
      "AI 芯片",
      "HBM 存储",
      "先进封装",
      "板级系统",
      "光互联",
      "服务器网络",
      "算力应用",
    ]);
  });

  it("keeps materials and equipment as stages and as cross-stage inputs", () => {
    const optical = atlasStageById.get("optical-interconnect");
    expect(optical?.diagram.inputs.map(({ label }) => label)).toEqual(
      expect.arrayContaining(["InP / SOI", "光纤 / 透镜", "光耦合 / 高速测试设备"]),
    );
    expect(optical?.diagram.outputs.map(({ label }) => label)).toEqual(
      expect.arrayContaining(["CPO", "可插拔光模块", "交换机 / AI 集群"]),
    );
    expect(
      mainChainConnections.filter(({ from }) => from === "materials").map(({ to }) => to),
    ).toEqual(
      expect.arrayContaining([
        "ai-chip",
        "hbm-memory",
        "advanced-packaging",
        "board-system",
        "optical-interconnect",
      ]),
    );
    expect(
      mainChainConnections.filter(({ from }) => from === "equipment").map(({ kind, to }) => `${kind}:${to}`),
    ).toEqual(
      expect.arrayContaining([
        "enable:ai-chip",
        "enable:hbm-memory",
        "enable:advanced-packaging",
        "enable:board-system",
        "enable:optical-interconnect",
      ]),
    );
  });

  it("splits semiconductor materials to minimum subnodes without making them all real nodes", () => {
    const materials = atlasStageById.get("materials");
    const labels = materials?.groups.flatMap((group) =>
      group.nodes.map((node) => node.label),
    );

    expect(labels).toEqual(
      expect.arrayContaining([
        "硅片",
        "SOI",
        "InP",
        "光刻胶",
        "电子气体",
        "CMP 抛光液",
        "CMP 抛光垫",
        "靶材",
        "ABF",
        "铜箔",
        "玻纤布",
        "液冷液",
      ]),
    );
  });

  it("maps real atlas nodes to their stage", () => {
    expect(getStageIdForNode("cpo")).toBe("optical-interconnect");
    expect(getStageIdForNode("optical-engine")).toBe("optical-interconnect");
    expect(getStageIdForNode("hbm")).toBe("hbm-memory");
    expect(getStageIdForNode("high-layer-pcb")).toBe("board-system");
    expect(getStageIdForNode("missing-node")).toBeNull();

    const optical = atlasStageById.get("optical-interconnect");
    expect(optical ? [...getStageRealNodeIds(optical)] : []).toEqual(
      expect.arrayContaining(["optical-chip", "laser", "optical-engine", "cpo"]),
    );
  });

  it("searches stage names, group names, subnode labels, and real node ids", () => {
    expect(findStageBySearch("光刻胶")?.id).toBe("materials");
    expect(findStageBySearch("高速测试")?.id).toBe("equipment");
    expect(findStageBySearch("CPO")?.id).toBe("optical-interconnect");
    expect(findStageBySearch("AIDC")?.id).toBe("compute-applications");
    expect(findStageBySearch("not found")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
npm run test -- tests/stage-map.test.ts
```

Expected: FAIL with an import error for `@/lib/atlas/stage-map`.

- [ ] **Step 3: Implement `lib/atlas/stage-map.ts`**

Create `lib/atlas/stage-map.ts` with these types and helpers:

```ts
export type AtlasStageId =
  | "materials"
  | "equipment"
  | "ai-chip"
  | "hbm-memory"
  | "advanced-packaging"
  | "board-system"
  | "optical-interconnect"
  | "server-network"
  | "compute-applications";

export type StageTone =
  | "material"
  | "equipment"
  | "chip"
  | "memory"
  | "packaging"
  | "board"
  | "optical"
  | "infrastructure"
  | "application";

export type StageConnectionKind = "flow" | "enable";
export type StageSubnodeKind =
  | "material"
  | "equipment"
  | "component"
  | "system"
  | "software"
  | "application";

export interface StageSubnode {
  id: string;
  label: string;
  description: string;
  kind: StageSubnodeKind;
  realNodeId?: string;
}

export interface StageGroup {
  id: string;
  title: string;
  summary: string;
  nodes: readonly StageSubnode[];
}

export interface StageDiagramNode {
  id: string;
  label: string;
  detail: string;
  kind: StageSubnodeKind;
  realNodeId?: string;
}

export interface StageDiagram {
  title: string;
  summary: string;
  inputs: readonly StageDiagramNode[];
  core: readonly StageDiagramNode[];
  outputs: readonly StageDiagramNode[];
}

export interface StageConnection {
  id: string;
  label: string;
  kind: StageConnectionKind;
}

export interface AtlasStage {
  id: AtlasStageId;
  order: number;
  name: string;
  shortName: string;
  role: string;
  input: string;
  output: string;
  summary: string;
  tone: StageTone;
  representativeNodeIds: readonly string[];
  diagram: StageDiagram;
  groups: readonly StageGroup[];
  internalConnections: readonly StageConnection[];
}

export interface MainChainConnection {
  id: string;
  from: AtlasStageId;
  to: AtlasStageId;
  kind: StageConnectionKind;
  label: string;
  summary: string;
}
```

Then add `atlasStages` as nine objects. Use these exact ids, names, and required content:

| id | name | must include real node ids |
| --- | --- | --- |
| `materials` | `材料` | `inp-material`, `silicon-photonics-material`, `optical-fiber-preform`, `low-loss-ccl` |
| `equipment` | `设备` | none required |
| `ai-chip` | `AI 芯片` | `switch-asic` |
| `hbm-memory` | `HBM 存储` | `hbm` |
| `advanced-packaging` | `先进封装` | `hbm` |
| `board-system` | `板级系统` | `high-layer-pcb`, `low-loss-ccl` |
| `optical-interconnect` | `光互联` | `optical-chip`, `laser`, `modulator`, `tia-driver`, `optical-dsp`, `fa-mpo`, `optical-engine`, `cpo`, `pluggable-optics` |
| `server-network` | `服务器网络` | `ai-server`, `ethernet-switch`, `ai-cluster` |
| `compute-applications` | `算力应用` | `ai-cluster` |

Use this implementation pattern for the exports after `atlasStages`:

```ts
export const defaultStageId: AtlasStageId = "optical-interconnect";

export const atlasStageById = new Map<AtlasStageId, AtlasStage>(
  atlasStages.map((stage) => [stage.id, stage]),
);

export const mainChainConnections: readonly MainChainConnection[] = [
  { id: "materials-to-ai-chip", from: "materials", to: "ai-chip", kind: "flow", label: "材料 → AI 芯片", summary: "硅片、电子气体、前驱体、湿电子化学品进入芯片制造。" },
  { id: "materials-to-hbm", from: "materials", to: "hbm-memory", kind: "flow", label: "材料 → HBM", summary: "硅片、电子材料和封装材料进入 DRAM 与 HBM 制造。" },
  { id: "materials-to-packaging", from: "materials", to: "advanced-packaging", kind: "flow", label: "材料 → 先进封装", summary: "ABF、Underfill、TIM 等进入 2.5D/3D 封装。" },
  { id: "materials-to-board", from: "materials", to: "board-system", kind: "flow", label: "材料 → 板级系统", summary: "低损耗 CCL、铜箔、玻纤布、树脂和热管理材料进入板级系统。" },
  { id: "materials-to-optical", from: "materials", to: "optical-interconnect", kind: "flow", label: "材料 → 光互联", summary: "InP、SOI、光纤、透镜和光胶进入光模块和 CPO。" },
  { id: "equipment-to-ai-chip", from: "equipment", to: "ai-chip", kind: "enable", label: "设备 ⇢ AI 芯片", summary: "前道设备决定先进制程良率和产能。" },
  { id: "equipment-to-hbm", from: "equipment", to: "hbm-memory", kind: "enable", label: "设备 ⇢ HBM", summary: "前道、堆叠和测试设备约束 HBM 量产。" },
  { id: "equipment-to-packaging", from: "equipment", to: "advanced-packaging", kind: "enable", label: "设备 ⇢ 先进封装", summary: "封装和测试设备决定 CoWoS、2.5D、3D 封装量产能力。" },
  { id: "equipment-to-board", from: "equipment", to: "board-system", kind: "enable", label: "设备 ⇢ 板级系统", summary: "PCB 设备和检测设备决定高速板良率。" },
  { id: "equipment-to-optical", from: "equipment", to: "optical-interconnect", kind: "enable", label: "设备 ⇢ 光互联", summary: "光耦合、精密贴装和高速测试决定 CPO 和光模块良率。" },
  { id: "ai-chip-to-packaging", from: "ai-chip", to: "advanced-packaging", kind: "flow", label: "AI 芯片 → 先进封装", summary: "GPU/ASIC 与 HBM 在先进封装中集成。" },
  { id: "hbm-to-packaging", from: "hbm-memory", to: "advanced-packaging", kind: "flow", label: "HBM → 先进封装", summary: "HBM 通过 2.5D/3D 封装靠近计算芯片。" },
  { id: "packaging-to-board", from: "advanced-packaging", to: "board-system", kind: "flow", label: "先进封装 → 板级系统", summary: "加速器模组进入 PCB、主板和服务器板级系统。" },
  { id: "board-to-server", from: "board-system", to: "server-network", kind: "flow", label: "板级系统 → 服务器网络", summary: "板卡、电源和散热系统进入 AI 服务器和交换机。" },
  { id: "optical-to-server", from: "optical-interconnect", to: "server-network", kind: "flow", label: "光互联 → 服务器网络", summary: "光模块、CPO 和 OCS 支撑 AI 集群网络。" },
  { id: "server-to-apps", from: "server-network", to: "compute-applications", kind: "flow", label: "服务器网络 → 算力应用", summary: "AI 集群输出训练、推理、云和行业应用能力。" },
];

export function getStageRealNodeIds(stage: AtlasStage): ReadonlySet<string> {
  const nodeIds = new Set(stage.representativeNodeIds);
  for (const group of stage.groups) {
    for (const node of group.nodes) {
      if (node.realNodeId) nodeIds.add(node.realNodeId);
    }
  }
  for (const section of [stage.diagram.inputs, stage.diagram.core, stage.diagram.outputs]) {
    for (const node of section) {
      if (node.realNodeId) nodeIds.add(node.realNodeId);
    }
  }
  return nodeIds;
}

export function getStageIdForNode(nodeId: string): AtlasStageId | null {
  for (const stage of atlasStages) {
    if (getStageRealNodeIds(stage).has(nodeId)) return stage.id;
  }
  return null;
}

const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase();

export function findStageBySearch(search: string): AtlasStage | null {
  const normalized = normalizeSearch(search);
  if (!normalized) return null;
  for (const stage of atlasStages) {
    const haystack = [
      stage.id,
      stage.name,
      stage.shortName,
      stage.role,
      stage.input,
      stage.output,
      stage.summary,
      stage.diagram.title,
      stage.diagram.summary,
      ...stage.representativeNodeIds,
      ...stage.groups.flatMap((group) => [
        group.title,
        group.summary,
        ...group.nodes.flatMap((node) => [
          node.id,
          node.label,
          node.description,
          node.realNodeId ?? "",
        ]),
      ]),
      ...stage.internalConnections.map((connection) => connection.label),
    ]
      .join(" ")
      .toLocaleLowerCase();
    if (haystack.includes(normalized)) return stage;
  }
  return null;
}
```

Populate the nine `atlasStages` objects with the labels and boundaries from `docs/superpowers/specs/2026-07-02-three-layer-ai-atlas-redesign-design.md`. Preserve the material subnode labels used by the test exactly.

- [ ] **Step 4: Run the stage-map test**

Run:

```bash
npm run test -- tests/stage-map.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit stage-map**

```bash
git add lib/atlas/stage-map.ts tests/stage-map.test.ts
git commit -m "feat: add three-layer atlas stage map"
```

---

### Task 2: Add selected stage to query state while preserving legacy links

**Files:**
- Modify: `lib/atlas/query-state.ts`
- Modify: `tests/query-state.test.ts`

- [ ] **Step 1: Update query-state tests first**

Add these cases to `tests/query-state.test.ts`:

```ts
it("defaults to the optical interconnect stage while preserving legacy layer and mode defaults", () => {
  expect(parseAtlasQuery(new URLSearchParams())).toMatchObject({
    layer: "interconnect",
    mode: "supply",
    stage: "optical-interconnect",
    node: null,
    company: null,
    search: "",
  });
});

it("roundtrips the selected stage with legacy layer and mode", () => {
  const state = {
    ...DEFAULT_ATLAS_QUERY,
    stage: "materials",
    search: "光刻胶",
  } as const;

  expect(serializeAtlasQuery(state).toString()).toBe(
    "layer=interconnect&mode=supply&stage=materials&q=%E5%85%89%E5%88%BB%E8%83%B6",
  );
  expect(parseAtlasQuery(serializeAtlasQuery(state))).toEqual(state);
});

it("normalizes unknown stage values to the default stage", () => {
  expect(parseAtlasQuery(new URLSearchParams("stage=unknown"))).toMatchObject({
    stage: "optical-interconnect",
  });
});
```

Update existing expected objects to include `stage: "optical-interconnect"` unless the test intentionally sets a different stage.

- [ ] **Step 2: Run query tests and verify failure**

Run:

```bash
npm run test -- tests/query-state.test.ts
```

Expected: FAIL because `AtlasQueryState` has no `stage`.

- [ ] **Step 3: Modify `lib/atlas/query-state.ts`**

Add imports and state:

```ts
import {
  atlasStageById,
  defaultStageId,
  type AtlasStageId,
} from "@/lib/atlas/stage-map";
```

Add to `AtlasQueryState`:

```ts
stage: AtlasStageId;
```

Add default:

```ts
stage: defaultStageId,
```

Add normalizer:

```ts
const normalizeStage = (value: string | null): AtlasStageId =>
  value && atlasStageById.has(value as AtlasStageId)
    ? (value as AtlasStageId)
    : DEFAULT_ATLAS_QUERY.stage;
```

Use it in `parseAtlasQuery`:

```ts
stage: normalizeStage(params.get("stage")),
```

Use it in `serializeAtlasQuery` after `mode`:

```ts
params.set("stage", normalizeStage(state.stage));
```

Keep `layer` and `mode` in serialized URLs for old-link compatibility.

- [ ] **Step 4: Run query tests**

Run:

```bash
npm run test -- tests/query-state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit query-state change**

```bash
git add lib/atlas/query-state.ts tests/query-state.test.ts
git commit -m "feat: persist selected atlas stage in query"
```

---

### Task 3: Rewrite component tests around the three-layer map

**Files:**
- Modify: `tests/atlas-app.test.tsx`

- [ ] **Step 1: Replace old overview test with three-layer screen assertions**

In `tests/atlas-app.test.tsx`, replace the existing `"renders a modular atlas overview instead of dense filters"` test with:

```ts
it("renders the three-layer 9-stage atlas without legacy side navigation or relationship controls", () => {
  renderAtlas();

  expect(screen.queryByRole("navigation", { name: "产业层级" })).not.toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "关系模式" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "AI 产业链三层地图" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "AI 产业链 9 段主链" })).toBeInTheDocument();

  for (const name of [
    "材料",
    "设备",
    "AI 芯片",
    "HBM 存储",
    "先进封装",
    "板级系统",
    "光互联",
    "服务器网络",
    "算力应用",
  ]) {
    expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
  }

  expect(screen.getByText("完整内部流程图")).toBeInTheDocument();
  expect(screen.getByText("可更新数据层")).toBeInTheDocument();
});
```

- [ ] **Step 2: Replace material/equipment expansion tests**

Replace the material test with:

```ts
it("shows material minimum subnodes in the data layer without crowding the main chain", () => {
  renderAtlas();

  fireEvent.click(screen.getByRole("button", { name: /材料/ }));

  expect(screen.getByRole("heading", { name: "材料完整内部流程图" })).toBeInTheDocument();
  expect(screen.getByText("硅片")).toBeInTheDocument();
  expect(screen.getAllByText("SOI").length).toBeGreaterThan(0);
  expect(screen.getByText("InP")).toBeInTheDocument();
  expect(screen.getByText("光刻胶")).toBeInTheDocument();
  expect(screen.getByText("电子气体")).toBeInTheDocument();
  expect(screen.getByText("CMP 抛光液")).toBeInTheDocument();
  expect(screen.getByText("ABF")).toBeInTheDocument();
  expect(screen.getByText("铜箔")).toBeInTheDocument();
  expect(screen.getByText("液冷液")).toBeInTheDocument();
  expect(screen.getByText("公司 / 行情 / PE")).toBeInTheDocument();
  expect(screen.getByText("供应关系 / 证据")).toBeInTheDocument();
});
```

Replace the equipment test with:

```ts
it("shows equipment as an upstream stage and as manufacturing enablement", () => {
  renderAtlas();

  fireEvent.click(screen.getByRole("button", { name: /设备/ }));

  expect(screen.getByRole("heading", { name: "设备完整内部流程图" })).toBeInTheDocument();
  expect(screen.getByText("前道设备")).toBeInTheDocument();
  expect(screen.getByText("光刻")).toBeInTheDocument();
  expect(screen.getByText("刻蚀")).toBeInTheDocument();
  expect(screen.getByText("薄膜沉积")).toBeInTheDocument();
  expect(screen.getByText("探针台 / 测试机")).toBeInTheDocument();
  expect(screen.getByText("光耦合")).toBeInTheDocument();
  expect(screen.getByText("设备 ⇢ 光互联")).toBeInTheDocument();
});
```

- [ ] **Step 3: Add selected optical stage test**

Add:

```ts
it("defaults to optical interconnect and shows a complete CPO internal flow", () => {
  renderAtlas();

  expect(screen.getByRole("button", { name: /光互联/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("heading", { name: "光互联完整内部流程图" })).toBeInTheDocument();
  expect(screen.getByText("InP / SOI")).toBeInTheDocument();
  expect(screen.getByText("光耦合 / 高速测试设备")).toBeInTheDocument();
  expect(screen.getByText("光芯片")).toBeInTheDocument();
  expect(screen.getByText("激光器")).toBeInTheDocument();
  expect(screen.getByText("DSP")).toBeInTheDocument();
  expect(screen.getByText("光引擎")).toBeInTheDocument();
  expect(screen.getByText("CPO")).toBeInTheDocument();
  expect(screen.getByText("交换机 / AI 集群")).toBeInTheDocument();
});
```

- [ ] **Step 4: Update URL expectation strings to include stage**

Where existing tests expect URLs such as:

```ts
"?layer=interconnect&mode=supply&q=silicon+photonics"
```

update to:

```ts
"?layer=interconnect&mode=supply&stage=optical-interconnect&q=silicon+photonics"
```

When a test clicks a stage before opening a node, expect that stage in the URL. For example, Broadcom from CPO should end at:

```ts
"?layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=broadcom"
```

- [ ] **Step 5: Run component test and verify failure**

Run:

```bash
npm run test -- tests/atlas-app.test.tsx
```

Expected: FAIL because the three-layer components have not been implemented.

- [ ] **Step 6: Commit failing tests**

```bash
git add tests/atlas-app.test.tsx
git commit -m "test: specify three-layer atlas interactions"
```

---

### Task 4: Implement focused three-layer React components

**Files:**
- Create: `components/atlas/stage-node-button.tsx`
- Create: `components/atlas/stage-chain.tsx`
- Create: `components/atlas/stage-detail.tsx`
- Create: `components/atlas/stage-data-layer.tsx`
- Create: `components/atlas/three-layer-atlas-canvas.tsx`
- Modify: `components/atlas/atlas-app.tsx`
- Delete: `components/atlas/poster-atlas-canvas.tsx`

- [ ] **Step 1: Create shared real-node button component**

Create `components/atlas/stage-node-button.tsx`:

```tsx
import type { AtlasCompany, AtlasNode } from "@/lib/atlas/schema";

interface StageNodeButtonProps {
  node: AtlasNode;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}

export function StageNodeButton({
  node,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: StageNodeButtonProps) {
  const isSelected = node.id === selectedNodeId;
  const isRelated = related ? related.has(node.id) : true;
  const leaders = node.companyIds
    .map((companyId) => companies.get(companyId))
    .filter((company): company is AtlasCompany => Boolean(company))
    .slice(0, 3);

  return (
    <button
      id={`atlas-node-${node.id}`}
      className="stage-node-button"
      type="button"
      aria-label={`${node.name} 产业节点`}
      aria-pressed={isSelected}
      data-testid={`node-${node.id}`}
      data-selected={isSelected}
      data-related={isRelated}
      onClick={() => onSelectNode(node.id)}
    >
      <strong>{node.name}</strong>
      <small>{leaders.map(({ name }) => name).join(" · ") || "待补公司数据"}</small>
    </button>
  );
}
```

- [ ] **Step 2: Create main-chain component**

Create `components/atlas/stage-chain.tsx`:

```tsx
import {
  atlasStages,
  mainChainConnections,
  type AtlasStageId,
} from "@/lib/atlas/stage-map";

interface StageChainProps {
  selectedStageId: AtlasStageId;
  onSelectStage: (stageId: AtlasStageId) => void;
}

export function StageChain({ selectedStageId, onSelectStage }: StageChainProps) {
  return (
    <section className="stage-chain-section" aria-label="AI 产业链 9 段主链">
      <header className="three-layer-section-heading">
        <span>1</span>
        <div>
          <h2>9 段主链</h2>
          <p>从材料、设备一路读到服务器网络和算力应用；点击任一阶段查看完整内部图。</p>
        </div>
      </header>
      <div className="stage-chain">
        {atlasStages.map((stage) => (
          <button
            key={stage.id}
            type="button"
            className="stage-card"
            data-tone={stage.tone}
            aria-pressed={stage.id === selectedStageId}
            onClick={() => onSelectStage(stage.id)}
          >
            <span>{String(stage.order).padStart(2, "0")}</span>
            <strong>{stage.name}</strong>
            <small>{stage.shortName} · {stage.role}</small>
          </button>
        ))}
      </div>
      <div className="main-chain-connections" aria-label="主链连接">
        {mainChainConnections.map((connection) => (
          <article
            key={connection.id}
            className="main-chain-connection"
            data-kind={connection.kind}
          >
            <strong>{connection.label}</strong>
            <small>{connection.kind === "enable" ? "工艺 / 产能约束" : "物料 / 产品流"}</small>
            <p>{connection.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create selected-stage internal diagram**

Create `components/atlas/stage-detail.tsx`:

```tsx
import { StageNodeButton } from "@/components/atlas/stage-node-button";
import type { AtlasCompany, AtlasNode } from "@/lib/atlas/schema";
import type { AtlasStage, StageDiagramNode } from "@/lib/atlas/stage-map";

interface StageDetailProps {
  stage: AtlasStage;
  nodes: ReadonlyMap<string, AtlasNode>;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}

function DiagramNode({
  node,
  nodes,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: {
  node: StageDiagramNode;
  nodes: ReadonlyMap<string, AtlasNode>;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}) {
  const realNode = node.realNodeId ? nodes.get(node.realNodeId) : undefined;
  if (realNode) {
    return (
      <StageNodeButton
        node={realNode}
        companies={companies}
        selectedNodeId={selectedNodeId}
        related={related}
        onSelectNode={onSelectNode}
      />
    );
  }
  return (
    <span className="stage-diagram-node" data-kind={node.kind} title={node.detail}>
      <strong>{node.label}</strong>
      <small>{node.detail}</small>
    </span>
  );
}

export function StageDetail({
  stage,
  nodes,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: StageDetailProps) {
  const sections = [
    { id: "inputs", title: "输入", nodes: stage.diagram.inputs },
    { id: "core", title: "内部模块", nodes: stage.diagram.core },
    { id: "outputs", title: "输出", nodes: stage.diagram.outputs },
  ] as const;

  return (
    <section className="stage-detail" data-tone={stage.tone}>
      <header className="three-layer-section-heading">
        <span>2</span>
        <div>
          <h2>{stage.name}完整内部流程图</h2>
          <p>{stage.diagram.summary}</p>
        </div>
      </header>
      <div className="stage-diagram" aria-label={`${stage.name}完整内部流程图`}>
        {sections.map((section) => (
          <div className="stage-diagram-column" data-section={section.id} key={section.id}>
            <h3>{section.title}</h3>
            <div className="stage-diagram-node-list">
              {section.nodes.map((node) => (
                <DiagramNode
                  key={node.id}
                  node={node}
                  nodes={nodes}
                  companies={companies}
                  selectedNodeId={selectedNodeId}
                  related={related}
                  onSelectNode={onSelectNode}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <aside className="stage-internal-connections" aria-label={`${stage.name}内部连接`}>
        <h3>内部连接</h3>
        <div>
          {stage.internalConnections.map((connection) => (
            <article data-kind={connection.kind} key={connection.id}>
              <strong>{connection.label}</strong>
              <small>{connection.kind === "enable" ? "制造使能" : "产品 / 物料流"}</small>
            </article>
          ))}
        </div>
      </aside>
    </section>
  );
}
```

- [ ] **Step 4: Create structured data-layer component**

Create `components/atlas/stage-data-layer.tsx`:

```tsx
import { StageNodeButton } from "@/components/atlas/stage-node-button";
import type { AtlasCompany, AtlasNode } from "@/lib/atlas/schema";
import type { AtlasStage } from "@/lib/atlas/stage-map";

interface StageDataLayerProps {
  stage: AtlasStage;
  nodes: ReadonlyMap<string, AtlasNode>;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}

export function StageDataLayer({
  stage,
  nodes,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: StageDataLayerProps) {
  return (
    <section className="stage-data-layer" aria-label={`${stage.name}可更新数据层`}>
      <header className="three-layer-section-heading">
        <span>3</span>
        <div>
          <h2>可更新数据层</h2>
          <p>公司、行情、市盈率和供应关系挂在结构化节点上，不写死在图片里。</p>
        </div>
      </header>
      <div className="stage-data-grid">
        {stage.groups.map((group) => (
          <article className="stage-data-group" key={group.id}>
            <h3>{group.title}</h3>
            <p>{group.summary}</p>
            <div className="stage-subnode-list">
              {group.nodes.map((subnode) => {
                const realNode = subnode.realNodeId ? nodes.get(subnode.realNodeId) : undefined;
                return realNode ? (
                  <StageNodeButton
                    key={subnode.id}
                    node={realNode}
                    companies={companies}
                    selectedNodeId={selectedNodeId}
                    related={related}
                    onSelectNode={onSelectNode}
                  />
                ) : (
                  <span className="stage-subnode" data-kind={subnode.kind} key={subnode.id} title={subnode.description}>
                    <strong>{subnode.label}</strong>
                    <small>待接公司数据</small>
                  </span>
                );
              })}
            </div>
          </article>
        ))}
        <article className="stage-data-group stage-data-placeholder">
          <h3>公司 / 行情 / PE</h3>
          <p>后续每日更新公司股价、市盈率、市值和更新时间。</p>
          <div className="stage-subnode-list">
            <span className="stage-subnode"><strong>代表公司</strong><small>节点挂载</small></span>
            <span className="stage-subnode"><strong>股价</strong><small>行情 provider</small></span>
            <span className="stage-subnode"><strong>PE</strong><small>估值指标</small></span>
          </div>
        </article>
        <article className="stage-data-group stage-data-placeholder">
          <h3>供应关系 / 证据</h3>
          <p>后续用边承载供应商、客户、证据来源和置信度。</p>
          <div className="stage-subnode-list">
            <span className="stage-subnode"><strong>供应给谁</strong><small>公司 → 公司</small></span>
            <span className="stage-subnode"><strong>证据来源</strong><small>公告 / 报告</small></span>
            <span className="stage-subnode"><strong>置信度</strong><small>关系状态</small></span>
          </div>
        </article>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create orchestrator component**

Create `components/atlas/three-layer-atlas-canvas.tsx`:

```tsx
import { useEffect } from "react";

import { StageChain } from "@/components/atlas/stage-chain";
import { StageDataLayer } from "@/components/atlas/stage-data-layer";
import { StageDetail } from "@/components/atlas/stage-detail";
import { getNeighborhood } from "@/lib/atlas/graph";
import {
  atlasStageById,
  defaultStageId,
  findStageBySearch,
  getStageIdForNode,
  getStageRealNodeIds,
  type AtlasStageId,
} from "@/lib/atlas/stage-map";
import type { AtlasCompany, AtlasIndustryEdge, AtlasNode } from "@/lib/atlas/schema";

interface ThreeLayerAtlasCanvasProps {
  nodes: readonly AtlasNode[];
  companies: readonly AtlasCompany[];
  edges: readonly AtlasIndustryEdge[];
  selectedStageId: AtlasStageId;
  selectedNodeId: string | null;
  search: string;
  empty: boolean;
  onSelectStage: (stageId: AtlasStageId) => void;
  onSelectNode: (nodeId: string) => void;
  onResetSearch: () => void;
}

export function ThreeLayerAtlasCanvas({
  nodes,
  companies,
  edges,
  selectedStageId,
  selectedNodeId,
  search,
  empty,
  onSelectStage,
  onSelectNode,
  onResetSearch,
}: ThreeLayerAtlasCanvasProps) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const selectedNodeStageId = selectedNodeId ? getStageIdForNode(selectedNodeId) : null;
  const searchStage = findStageBySearch(search);
  const activeStageId = selectedNodeStageId ?? searchStage?.id ?? selectedStageId;
  const stage = atlasStageById.get(activeStageId) ?? atlasStageById.get(defaultStageId);
  const nodeIdSet = new Set(nodes.map(({ id }) => id));
  const visibleEdges = edges.filter(({ from, to }) => nodeIdSet.has(from) && nodeIdSet.has(to));
  const related = selectedNodeId ? getNeighborhood(selectedNodeId, visibleEdges) : null;

  useEffect(() => {
    if (activeStageId !== selectedStageId) onSelectStage(activeStageId);
  }, [activeStageId, onSelectStage, selectedStageId]);

  if (empty) {
    return (
      <section className="three-layer-workspace" aria-label="AI 产业链三层地图画布">
        <div className="poster-empty">
          <p>没有找到匹配的节点或公司</p>
          <button type="button" onClick={onResetSearch}>重置搜索</button>
        </div>
      </section>
    );
  }

  return (
    <section className="three-layer-workspace" aria-label="AI 产业链三层地图画布">
      <div className="poster-scroll">
        <article className="three-layer-sheet">
          <header className="three-layer-hero">
            <p>从上游材料到下游 AI 应用</p>
            <h1>AI 产业链三层地图</h1>
            <small>第一眼看 9 段主链；点击阶段看完整内部图；公司、行情、PE 和供应关系挂在下方结构化数据层。</small>
          </header>
          <StageChain selectedStageId={activeStageId} onSelectStage={onSelectStage} />
          {stage ? (
            <>
              <StageDetail
                stage={stage}
                nodes={nodeById}
                companies={companyById}
                selectedNodeId={selectedNodeId}
                related={related}
                onSelectNode={onSelectNode}
              />
              <StageDataLayer
                stage={stage}
                nodes={nodeById}
                companies={companyById}
                selectedNodeId={selectedNodeId}
                related={related}
                onSelectNode={onSelectNode}
              />
            </>
          ) : null}
          <div className="visually-hidden" aria-label="可见产业关系">
            <h2>可见产业关系</h2>
            <ul>
              {visibleEdges.map((edge) => (
                <li key={`summary-${edge.id}`}>
                  {nodeById.get(edge.from)?.name ?? edge.from} → {nodeById.get(edge.to)?.name ?? edge.to}（{edge.type}）
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Wire `AtlasApp` to the new canvas**

In `components/atlas/atlas-app.tsx`:

Replace:

```ts
import { PosterAtlasCanvas } from "@/components/atlas/poster-atlas-canvas";
```

with:

```ts
import { ThreeLayerAtlasCanvas } from "@/components/atlas/three-layer-atlas-canvas";
```

Replace the existing `PosterAtlasCanvas` JSX element with:

```tsx
<ThreeLayerAtlasCanvas
  nodes={posterNodes}
  companies={initialSnapshot.companies}
  edges={initialSnapshot.industryEdges}
  selectedStageId={query.stage}
  selectedNodeId={selectedNode?.id ?? null}
  search={normalizedSearch}
  empty={posterNodes.length === 0}
  onSelectStage={(stage) => {
    setFocusAnchorNodeId(null);
    updateQuery({ stage, node: null, company: null });
  }}
  onSelectNode={(node) => {
    setFocusAnchorNodeId(null);
    nodeTriggerRef.current = document.activeElement as HTMLElement;
    updateQuery({ node, company: null });
  }}
  onResetSearch={() => {
    setFocusAnchorNodeId(null);
    setSearchInput("");
    updateQuery({ search: "", node: null, company: null }, "replace");
  }}
/>
```

In company-drawer `onSelectNode`, keep legacy layer but add stage:

```ts
const nextStage = getStageIdForNode(node.id) ?? queryRef.current.stage;
updateQuery({ layer: node.layer, stage: nextStage, node: node.id, company: null });
```

Import `getStageIdForNode` from `@/lib/atlas/stage-map`.

- [ ] **Step 7: Delete the old poster canvas**

After no imports reference it:

```bash
git rm components/atlas/poster-atlas-canvas.tsx
```

Do not delete `module-map.ts` in this task; delete it in Task 7 after all tests prove the new stage map is the only source of truth.

- [ ] **Step 8: Run component test**

Run:

```bash
npm run test -- tests/atlas-app.test.tsx
```

Expected: component tests still fail on styling-independent text if stage data is incomplete; fix missing stage labels in `lib/atlas/stage-map.ts`, then rerun until PASS.

- [ ] **Step 9: Commit component implementation**

```bash
git add components/atlas components/atlas/atlas-app.tsx lib/atlas/stage-map.ts tests/atlas-app.test.tsx
git commit -m "feat: render three-layer atlas canvas"
```

---

### Task 5: Add desktop-first three-layer styles

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add style assertions to component tests**

In the first atlas-app test, add:

```ts
expect(screen.getByRole("region", { name: "AI 产业链 9 段主链" })).toHaveClass(
  "stage-chain-section",
);
expect(screen.getByLabelText("光互联完整内部流程图")).toHaveClass("stage-diagram");
```

Run:

```bash
npm run test -- tests/atlas-app.test.tsx
```

Expected: PASS if classes exist from Task 4; CSS visual quality is checked by browser QA.

- [ ] **Step 2: Append three-layer CSS overrides**

Add a final CSS block near the end of `app/globals.css`, after existing modular atlas overrides:

```css
/* Three-layer atlas redesign */

.three-layer-workspace {
  position: relative;
  grid-column: 1;
  grid-row: 2;
  min-width: 0;
  overflow: hidden;
}

.three-layer-sheet {
  width: min(1480px, calc(100vw - 48px));
  min-width: 1180px;
  margin: 26px auto 56px;
  padding: 28px;
  color: #241b15;
  border: 1px solid rgba(109, 83, 52, 0.22);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 252, 246, 0.98), rgba(255, 247, 232, 0.96)),
    radial-gradient(circle at 12% 10%, rgba(71, 127, 183, 0.12), transparent 30rem),
    radial-gradient(circle at 90% 15%, rgba(118, 168, 93, 0.12), transparent 30rem);
  box-shadow: 0 28px 70px rgba(88, 61, 26, 0.14);
}

.three-layer-hero {
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(61, 92, 120, 0.16);
}

.three-layer-hero p {
  margin: 0 0 6px;
  color: #356c9e;
  font-size: 14px;
  font-weight: 850;
  letter-spacing: 0.15em;
}

.three-layer-hero h1 {
  margin: 0;
  color: #203f65;
  font-size: clamp(42px, 5vw, 68px);
  line-height: 0.98;
  font-weight: 950;
  letter-spacing: -0.06em;
}

.three-layer-hero small {
  display: block;
  max-width: 900px;
  margin-top: 12px;
  color: #73583b;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.55;
}

.stage-chain-section,
.stage-detail,
.stage-data-layer {
  margin-top: 20px;
  padding: 18px;
  border: 1px solid rgba(97, 77, 55, 0.18);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.58);
}

.three-layer-section-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.three-layer-section-heading > span {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  flex: 0 0 auto;
  color: #fff;
  font-size: 16px;
  font-weight: 950;
  border-radius: 14px;
  background: #315f8c;
  box-shadow: 0 12px 22px rgba(49, 95, 140, 0.18);
}

.three-layer-section-heading h2 {
  margin: 0;
  color: #2d241b;
  font-size: 28px;
  font-weight: 950;
  letter-spacing: -0.03em;
}

.three-layer-section-heading p {
  margin: 4px 0 0;
  color: #765b3a;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}

.stage-chain {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 10px;
}

.stage-card {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 150px;
  padding: 13px;
  color: #2e261d;
  text-align: left;
  border: 1.5px solid rgba(73, 92, 112, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.stage-card:hover,
.stage-card:focus-visible {
  border-color: #d87236;
  outline: 0;
  box-shadow: 0 10px 18px rgba(97, 65, 30, 0.12);
  transform: translateY(-1px);
}

.stage-card[aria-pressed="true"] {
  border-color: #d87236;
  background: #fff0dc;
  box-shadow: 0 0 0 3px rgba(216, 114, 54, 0.16);
}

.stage-card > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #fff;
  font-size: 12px;
  font-weight: 950;
  border-radius: 12px;
  background: #315f8c;
}

.stage-card strong {
  color: #2f251b;
  font-size: 18px;
  font-weight: 950;
  line-height: 1.12;
}

.stage-card small {
  color: #755d41;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.45;
}

.main-chain-connections {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.main-chain-connection,
.stage-internal-connections article,
.stage-data-group {
  border: 1.5px solid rgba(71, 127, 183, 0.24);
  border-radius: 16px;
  background: rgba(247, 251, 255, 0.78);
  box-shadow: 0 12px 22px rgba(99, 72, 35, 0.06);
}

.main-chain-connection {
  display: grid;
  gap: 5px;
  min-height: 86px;
  padding: 13px;
}

.main-chain-connection[data-kind="enable"],
.stage-internal-connections article[data-kind="enable"] {
  border-style: dashed;
  border-color: rgba(108, 127, 79, 0.4);
  background: rgba(249, 255, 240, 0.76);
}

.main-chain-connection strong,
.stage-internal-connections strong {
  color: #2f251b;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.35;
}

.main-chain-connection small,
.stage-internal-connections small {
  color: #315f8c;
  font-size: 10px;
  font-weight: 900;
}

.main-chain-connection p {
  margin: 0;
  color: #7b6245;
  font-size: 11px;
  font-weight: 720;
  line-height: 1.45;
}

.stage-diagram {
  display: grid;
  grid-template-columns: 0.95fr 1.25fr 0.95fr;
  gap: 14px;
}

.stage-diagram-column {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 14px;
  border: 1.5px solid rgba(125, 98, 64, 0.18);
  border-radius: 18px;
  background: rgba(255, 252, 244, 0.88);
}

.stage-diagram-column h3,
.stage-data-group h3,
.stage-internal-connections h3 {
  margin: 0;
  color: #2f251b;
  font-size: 17px;
  font-weight: 930;
}

.stage-diagram-node-list,
.stage-subnode-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stage-diagram-node,
.stage-subnode,
.stage-node-button {
  display: inline-grid;
  gap: 4px;
  min-width: 110px;
  min-height: 54px;
  padding: 9px 10px;
  color: #2e261d;
  text-align: left;
  border: 1px solid rgba(73, 92, 112, 0.18);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.84);
}

.stage-node-button {
  width: 100%;
}

.stage-node-button:hover,
.stage-node-button:focus-visible {
  border-color: #d87236;
  outline: 0;
  box-shadow: 0 10px 18px rgba(97, 65, 30, 0.12);
}

.stage-node-button[data-selected="true"] {
  border-color: #d87236;
  background: #fff0dc;
  box-shadow: 0 0 0 3px rgba(216, 114, 54, 0.16);
}

.stage-node-button[data-related="false"] {
  opacity: 0.48;
}

.stage-diagram-node[data-kind="material"],
.stage-subnode[data-kind="material"] {
  border-color: rgba(210, 130, 53, 0.34);
  background: rgba(255, 247, 229, 0.9);
}

.stage-diagram-node[data-kind="equipment"],
.stage-subnode[data-kind="equipment"] {
  border-style: dashed;
  border-color: rgba(108, 127, 79, 0.42);
  background: rgba(249, 255, 240, 0.82);
}

.stage-diagram-node strong,
.stage-subnode strong,
.stage-node-button strong {
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
}

.stage-diagram-node small,
.stage-subnode small,
.stage-node-button small {
  color: #80654a;
  font-size: 10px;
  font-weight: 780;
  line-height: 1.35;
}

.stage-internal-connections {
  margin-top: 14px;
}

.stage-internal-connections > div {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.stage-internal-connections article {
  display: grid;
  gap: 5px;
  padding: 13px;
}

.stage-data-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stage-data-group {
  padding: 15px;
}

.stage-data-group p {
  margin: 6px 0 12px;
  color: #755d41;
  font-size: 12px;
  line-height: 1.55;
}

.stage-data-placeholder {
  background: rgba(255, 252, 244, 0.86);
}

@media (max-width: 1240px) {
  .three-layer-sheet {
    min-width: 1040px;
  }

  .stage-chain {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .main-chain-connections,
  .stage-internal-connections > div,
  .stage-data-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 899px) {
  .three-layer-sheet {
    width: min(980px, calc(100vw - 32px));
    min-width: 0;
    margin: 18px auto 40px;
  }

  .stage-chain,
  .stage-diagram,
  .stage-data-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Remove stale modular selectors only after visual check**

Delete the old block headed:

```css
/* Modular atlas redesign overrides */
```

Keep drawer, header, `.poster-scroll`, `.poster-empty`, and general app styles that the new components still use.

- [ ] **Step 4: Run component tests and typecheck**

Run:

```bash
npm run test -- tests/atlas-app.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit styles**

```bash
git add app/globals.css tests/atlas-app.test.tsx
git commit -m "style: add three-layer atlas layout"
```

---

### Task 6: Update search and URL behavior

**Files:**
- Modify: `components/atlas/atlas-app.tsx`
- Modify: `tests/atlas-app.test.tsx`
- Modify: `tests/query-state.test.ts`

- [ ] **Step 1: Add tests for stage-aware search**

Add to `tests/atlas-app.test.tsx`:

```ts
it("searches virtual subnodes and opens their owning stage", () => {
  vi.useFakeTimers();
  const { replace } = renderAtlas();
  const search = screen.getByRole("searchbox", { name: "搜索节点、公司或代码" });

  fireEvent.change(search, { target: { value: "光刻胶" } });
  act(() => vi.advanceTimersByTime(200));

  expect(screen.getByRole("button", { name: /材料/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("heading", { name: "材料完整内部流程图" })).toBeInTheDocument();
  expect(screen.getByText("光刻胶")).toBeInTheDocument();
  expect(replace).toHaveBeenLastCalledWith(
    "?layer=interconnect&mode=supply&stage=materials&q=%E5%85%89%E5%88%BB%E8%83%B6",
  );
});
```

- [ ] **Step 2: Make `AtlasApp` stage-aware during debounced search**

In the search debounce effect in `components/atlas/atlas-app.tsx`, compute stage from the search text:

```ts
const searchStage = findStageBySearch(searchInput);
updateQuery(
  {
    search: searchInput,
    stage: searchStage?.id ?? query.stage,
    node: null,
    company: null,
  },
  "replace",
);
```

Import `findStageBySearch` from `@/lib/atlas/stage-map`.

- [ ] **Step 3: Preserve selected stage when closing drawers**

In `closeNodeDrawer`, do not clear stage:

```ts
updateQuery({ node: null, company: null });
```

This already preserves unspecified fields. Add a test if it regresses:

```ts
it("preserves the selected stage when closing a node drawer", () => {
  const { push } = renderAtlas();
  fireEvent.click(screen.getByRole("button", { name: /光互联/ }));
  fireEvent.click(screen.getByTestId("node-cpo"));
  fireEvent.keyDown(document, { key: "Escape" });

  expect(push).toHaveBeenLastCalledWith(
    "?layer=interconnect&mode=supply&stage=optical-interconnect",
  );
});
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
npm run test -- tests/query-state.test.ts tests/atlas-app.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit search behavior**

```bash
git add components/atlas/atlas-app.tsx tests/atlas-app.test.tsx tests/query-state.test.ts
git commit -m "feat: make atlas search stage-aware"
```

---

### Task 7: Remove obsolete module-map implementation and update E2E

**Files:**
- Delete: `lib/atlas/module-map.ts`
- Modify: `tests/e2e/atlas.spec.ts`

- [ ] **Step 1: Confirm no imports use `module-map`**

Run:

```bash
rg "module-map|atlasModules|moduleConnections|PosterAtlasCanvas"
```

Expected: no output.

- [ ] **Step 2: Delete old module map**

Run:

```bash
git rm lib/atlas/module-map.ts
```

- [ ] **Step 3: Update Playwright desktop test**

Replace the second test title and body with a desktop-first three-layer test. Keep the CPO company drawer test because the drawer is still in scope.

Use:

```ts
test("explores the three-layer atlas and opens the CPO drawer", async ({ page }) => {
  await page.goto("/?stage=optical-interconnect&node=cpo");

  await expect(page.getByRole("heading", { name: "AI 产业链三层地图" })).toBeVisible();
  await expect(page.getByRole("region", { name: "AI 产业链 9 段主链" })).toBeVisible();
  await expect(page.getByRole("button", { name: /光互联/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("heading", { name: "光互联完整内部流程图" })).toBeVisible();
  await expect(page.getByText("InP / SOI")).toBeVisible();
  await expect(page.getByText("光耦合 / 高速测试设备")).toBeVisible();
  await expect(page.getByText("CPO")).toBeVisible();
  await expect(page.getByText("公司 / 行情 / PE")).toBeVisible();
  await expect(page.getByRole("group", { name: "关系模式" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "产业层级" })).toHaveCount(0);

  await page.getByTestId("node-cpo").click();
  await expect(page.getByRole("dialog", { name: /共封装光学/ })).toBeVisible();
  await expect(page.getByAltText("CPO 技术剖面示意图")).toBeVisible();
});
```

If the existing mobile E2E test is kept, make it broad and non-blocking for design details:

```ts
test("mobile can scroll the three-layer atlas and open CPO", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI 产业链三层地图" })).toBeVisible();
  await page.getByRole("button", { name: /光互联/ }).click();
  await expect(page.getByRole("heading", { name: "光互联完整内部流程图" })).toBeVisible();
  await page.getByTestId("node-cpo").click();
  await expect(page.getByRole("dialog", { name: /共封装光学/ })).toBeVisible();
});
```

- [ ] **Step 4: Run unit and E2E tests**

Run:

```bash
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

Expected: all PASS.

- [ ] **Step 5: Commit cleanup and E2E**

```bash
git add tests/e2e/atlas.spec.ts
git rm lib/atlas/module-map.ts
git commit -m "test: verify three-layer atlas flow"
```

---

### Task 8: Browser QA and final verification

**Files:**
- Modify only if QA finds issues: `app/globals.css`, `components/atlas/*.tsx`, `lib/atlas/stage-map.ts`, tests.

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev
```

Expected: Next dev server starts and prints a localhost URL.

- [ ] **Step 2: Browser QA desktop**

Open `/` in the in-app browser and check:

- title says `AI 产业链三层地图`;
- no left directory;
- no relationship mode filter;
- 9 main stages are visible and readable;
- default selected stage is `光互联`;
- selected stage shows a complete internal diagram;
- material and equipment appear both as main-chain stages and as input/process nodes inside other stages;
- data layer contains `公司 / 行情 / PE` and `供应关系 / 证据`;
- clicking `CPO` opens the existing node drawer and shows the raster CPO illustration;
- clicking `博通` from the drawer opens the existing company drawer.

- [ ] **Step 3: Browser QA search**

In the search input:

- search `光刻胶`; expected stage switches to `材料` and shows `光刻胶`;
- search `AVGO`; expected `CPO` node is visible and clickable;
- search an impossible term; expected empty state and reset button;
- click reset; expected all stages return and query search is cleared.

- [ ] **Step 4: Full verification**

Run:

```bash
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

Expected: all PASS.

- [ ] **Step 5: Final commit if QA required tweaks**

If QA caused code changes:

```bash
git add app/globals.css components/atlas lib/atlas tests
git commit -m "fix: polish three-layer atlas QA issues"
```

If QA caused no code changes, do not create an empty commit.

---

## Plan Self-Review

- Spec coverage:
  - 9-stage main chain: Task 1, Task 4, Task 5.
  - Stage internal complete diagrams: Task 1 and Task 4.
  - Structured data layer for company/market/supply placeholders: Task 4 and Task 5.
  - Materials/equipment as upstream stages and internal inputs: Task 1 tests and data.
  - No left directory or relationship mode controls: Task 3 and Task 7 tests.
  - Desktop-first readability: Task 5 and Task 8.
  - No fake market or supply data: Task 4 data layer uses placeholders, existing drawers remain evidence-based.
- Type consistency:
  - `AtlasStageId`, `StageDiagram`, and helper names are defined in Task 1 and reused consistently in later tasks.
  - `stage` query is added in Task 2 and used in Task 4 and Task 6.
  - `StageNodeButton` is created once and reused by diagram/data components.
- Scope control:
  - Live provider integration, new companies, and supply evidence ingestion are outside this implementation plan.

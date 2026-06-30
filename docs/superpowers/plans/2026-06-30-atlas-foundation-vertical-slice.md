# AI Industry Atlas Foundation Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable Next.js vertical slice that renders a verified CPO-centered industry path, company details, evidence-backed supply relationships, cached market snapshots, and a responsive mobile view.

**Architecture:** A Next.js App Router application reads validated catalog data through a repository interface. The first implementation uses checked-in fixtures and a PostgreSQL-compatible migration; a Supabase repository and live market provider are enabled in later plans without changing UI contracts. URL query parameters own the selected layer, node, company, and relationship mode so desktop and mobile links are shareable.

**Tech Stack:** Next.js, React, TypeScript, CSS Modules/global CSS, Zod, Vitest, Testing Library, Playwright, Supabase/PostgreSQL migrations.

---

## Delivery roadmap

1. **Foundation vertical slice — this plan:** application shell, schemas, CPO path, repository boundary, relation canvas, company drawer, cached market snapshot, responsive QA.
2. **Complete catalog:** expand the validated catalog to 120–140 nodes; add 2–5 leaders per material node; run coverage and source audits.
3. **Supply graph:** add evidence ingestion, confidence filters, historical validity, company-to-company graph, and editorial review workflow.
4. **Market pipeline:** implement the selected market-data provider adapter, scheduled fundamentals updates, on-open delayed quotes, cache fallback, rate limits, and Vercel cron.
5. **Visual assets and production release:** create 15 AI technical illustrations, PWA metadata, accessibility polish, Supabase production policies, deployment and monitoring.

## Planned file structure

```text
app/
  api/atlas/route.ts             # Read-only atlas API
  globals.css                    # Design tokens and responsive shell
  layout.tsx                     # Metadata and root layout
  page.tsx                       # Server entry and initial snapshot
components/atlas/
  atlas-app.tsx                  # URL-backed application state
  atlas-header.tsx               # Search and relationship controls
  layer-nav.tsx                  # Seven-layer navigation
  relationship-canvas.tsx       # Deterministic SVG graph
  node-drawer.tsx                # Node details and leaders
  company-drawer.tsx             # Company, market and supply evidence
content/seed/
  vertical-slice.ts              # CPO path fixture data
lib/atlas/
  schema.ts                      # Zod domain contracts
  graph.ts                       # Neighborhood and layout functions
  repository.ts                  # Repository interface and fixture adapter
  query-state.ts                 # URL state parser/serializer
supabase/migrations/
  202606300001_atlas_core.sql    # Core relational schema and RLS
tests/
  atlas-schema.test.ts
  graph.test.ts
  query-state.test.ts
  repository.test.ts
  atlas-app.test.tsx
  e2e/atlas.spec.ts
vitest.config.ts
playwright.config.ts
```

### Task 1: Scaffold the tested Next.js application

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "ai-industry-chain-atlas",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.50.0",
    "next": "^15.3.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.52.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "jsdom": "^26.1.0",
    "typescript": "^5.8.0",
    "vite": "^6.3.0",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Add strict TypeScript and environment guards**

Create `.env.example` with names only:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MARKET_DATA_PROVIDER=eodhd
MARKET_DATA_API_KEY=
```

Add `.env*` to `.gitignore`, while allowing `.env.example`. Configure `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, and the `@/*` path alias.

- [ ] **Step 3: Add the minimal root layout and page**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Industry Atlas",
  description: "全球 AI 全产业链研究图谱",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
```

```tsx
// app/page.tsx
export default function HomePage() {
  return <main><h1>AI Industry Atlas</h1></main>;
}
```

- [ ] **Step 4: Install dependencies and verify the baseline**

Run: `npm install && npm run typecheck && npm run build`

Expected: dependencies install, TypeScript exits 0, and Next.js produces a successful production build.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts playwright.config.ts app .gitignore .env.example
git commit -m "chore: scaffold atlas application"
```

### Task 2: Define and validate the atlas domain contracts

**Files:**
- Create: `lib/atlas/schema.ts`
- Create: `tests/atlas-schema.test.ts`

- [ ] **Step 1: Write failing contract tests**

```ts
import { describe, expect, it } from "vitest";
import { atlasSnapshotSchema } from "@/lib/atlas/schema";

describe("atlasSnapshotSchema", () => {
  it("rejects a material node without two leaders", () => {
    const result = atlasSnapshotSchema.safeParse({
      nodes: [{ id: "inp", layer: "materials", kind: "material", name: "InP", summary: "用于高速光芯片的磷化铟材料", technology: "为高速激光器与探测器提供直接带隙化合物半导体基础。", barriers: ["晶体纯度"], drivers: ["高速光互联"], risks: ["良率"], companyIds: ["a"], sourceIds: ["s1"] }],
      companies: [{ id: "a", name: "A", ticker: "A", exchange: "NASDAQ", market: "US", currency: "USD" }],
      industryEdges: [], supplyRelations: [], marketSnapshots: [], sources: [{ id: "s1", title: "Source", url: "https://example.com/source", publisher: "Example", checkedAt: "2026-06-30T00:00:00Z" }]
    });
    expect(result.success).toBe(false);
  });

  it("rejects a supply relation without evidence", () => {
    const result = atlasSnapshotSchema.safeParse({
      nodes: [], companies: [], industryEdges: [], marketSnapshots: [], sources: [],
      supplyRelations: [{ id: "r1", supplierId: "a", customerId: "b", nodeId: "cpo", product: "optical engine", status: "company_confirmed", evidenceSourceIds: [] }]
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/atlas-schema.test.ts`

Expected: FAIL because `@/lib/atlas/schema` does not exist.

- [ ] **Step 3: Implement explicit Zod schemas**

Define these exported contracts in `lib/atlas/schema.ts`:

```ts
import { z } from "zod";

export const layerSchema = z.enum(["materials", "manufacturing", "chips", "interconnect", "infrastructure", "platform", "applications"]);
export const relationStatusSchema = z.enum(["company_confirmed", "counterparty_confirmed", "regulatory_disclosure", "multi_source_report", "market_speculation"]);

export const companySchema = z.object({
  id: z.string().min(1), name: z.string().min(1), ticker: z.string().min(1),
  exchange: z.string().min(1), market: z.enum(["US", "CN", "HK", "TW", "KR", "JP", "EU", "PRIVATE"]), currency: z.string().length(3)
});

export const nodeSchema = z.object({
  id: z.string().min(1), layer: layerSchema, kind: z.enum(["material", "equipment", "component", "system", "software", "application"]),
  name: z.string().min(1), englishName: z.string().optional(), summary: z.string().min(8),
  technology: z.string().min(20), barriers: z.array(z.string()).min(1), drivers: z.array(z.string()).min(1),
  risks: z.array(z.string()).min(1), companyIds: z.array(z.string()).min(1), sourceIds: z.array(z.string()).min(1)
}).superRefine((node, ctx) => {
  if (node.kind === "material" && node.companyIds.length < 2) ctx.addIssue({ code: "custom", path: ["companyIds"], message: "material nodes require at least two leaders" });
});

export const sourceSchema = z.object({ id: z.string(), title: z.string(), url: z.string().url(), publisher: z.string(), publishedAt: z.string().date().optional(), checkedAt: z.string().datetime() });
export const industryEdgeSchema = z.object({ id: z.string(), from: z.string(), to: z.string(), type: z.enum(["supply", "integrate", "deploy"]) });
export const supplyRelationSchema = z.object({ id: z.string(), supplierId: z.string(), customerId: z.string(), nodeId: z.string(), product: z.string().min(2), status: relationStatusSchema, evidenceSourceIds: z.array(z.string()).min(1), announcedAt: z.string().date().optional() });
export const marketSnapshotSchema = z.object({ companyId: z.string(), price: z.number().nonnegative(), changePct: z.number(), currency: z.string().length(3), tradedAt: z.string().datetime(), fetchedAt: z.string().datetime(), delayMinutes: z.number().int().nonnegative(), ttmEps: z.number().nullable(), ttmPe: z.number().positive().nullable() });

export const atlasSnapshotSchema = z.object({
  nodes: z.array(nodeSchema), companies: z.array(companySchema), industryEdges: z.array(industryEdgeSchema),
  supplyRelations: z.array(supplyRelationSchema), marketSnapshots: z.array(marketSnapshotSchema), sources: z.array(sourceSchema)
});
export type AtlasSnapshot = z.infer<typeof atlasSnapshotSchema>;
```

- [ ] **Step 4: Run the schema tests**

Run: `npm test -- tests/atlas-schema.test.ts`

Expected: PASS with 2 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/atlas/schema.ts tests/atlas-schema.test.ts
git commit -m "feat: define validated atlas contracts"
```

### Task 3: Add a sourced CPO-centered vertical slice

**Files:**
- Create: `content/seed/vertical-slice.ts`
- Create: `tests/repository.test.ts`
- Create: `lib/atlas/repository.ts`

- [ ] **Step 1: Write the failing fixture repository test**

```ts
import { describe, expect, it } from "vitest";
import { fixtureAtlasRepository } from "@/lib/atlas/repository";

describe("fixtureAtlasRepository", () => {
  it("returns a valid CPO path and leader coverage", async () => {
    const atlas = await fixtureAtlasRepository.getSnapshot();
    expect(atlas.nodes.find((node) => node.id === "cpo")).toBeDefined();
    expect(atlas.industryEdges.some((edge) => edge.from === "optical-chip" && edge.to === "cpo")).toBe(true);
    expect(atlas.nodes.filter((node) => node.kind === "material").every((node) => node.companyIds.length >= 2)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the repository test and confirm failure**

Run: `npm test -- tests/repository.test.ts`

Expected: FAIL because the repository is missing.

- [ ] **Step 3: Create the exact vertical-slice inventory**

In `content/seed/vertical-slice.ts`, create validated records for these 18 nodes:

```text
inp-material, silicon-photonics-material, optical-fiber-preform, low-loss-ccl,
optical-chip, laser, modulator, tia-driver, optical-dsp, fa-mpo,
high-layer-pcb, switch-asic, pluggable-optics, optical-engine, cpo,
ethernet-switch, ai-server, ai-cluster
```

Include at least these public companies as role-specific representatives: Broadcom (`AVGO`), Marvell (`MRVL`), Coherent (`COHR`), Lumentum (`LITE`), Corning (`GLW`), TSMC (`TSM`), NVIDIA (`NVDA`), SK hynix (`000660.KS`), Arista Networks (`ANET`), Fabrinet (`FN`), Zhongji Innolight (`300308.SZ`), Eoptolink (`300502.SZ`), Shennan Circuits (`002916.SZ`), Victory Giant (`300476.SZ`), Shengyi Technology (`600183.SH`), and Kingboard Laminates (`1888.HK`). Each material node must reference at least two companies and one primary source.

Add this highlighted path as typed industry edges:

```text
inp-material -> optical-chip -> optical-engine -> cpo -> ethernet-switch -> ai-cluster
low-loss-ccl -> high-layer-pcb -> cpo
switch-asic -> cpo
cpo -> ai-server -> ai-cluster
```

Add only publicly evidenced supply relations. Seed at least the NVIDIA–SK hynix memory partnership as a cross-layer example and Broadcom's internally integrated CPO platform as a company-to-node capability; do not invent an unnamed customer.

- [ ] **Step 4: Implement the repository boundary**

```ts
// lib/atlas/repository.ts
import { atlasSnapshotSchema, type AtlasSnapshot } from "./schema";
import { verticalSlice } from "@/content/seed/vertical-slice";

export interface AtlasRepository { getSnapshot(): Promise<AtlasSnapshot> }

export const fixtureAtlasRepository: AtlasRepository = {
  async getSnapshot() { return atlasSnapshotSchema.parse(verticalSlice); }
};
```

- [ ] **Step 5: Run repository and schema tests**

Run: `npm test -- tests/repository.test.ts tests/atlas-schema.test.ts`

Expected: PASS; the fixture parses and the CPO path exists.

- [ ] **Step 6: Commit**

```bash
git add content/seed/vertical-slice.ts lib/atlas/repository.ts tests/repository.test.ts
git commit -m "feat: seed sourced CPO industry path"
```

### Task 4: Implement deterministic graph queries and layout

**Files:**
- Create: `lib/atlas/graph.ts`
- Create: `tests/graph.test.ts`

- [ ] **Step 1: Write failing graph tests**

```ts
import { describe, expect, it } from "vitest";
import { getNeighborhood, layoutByRank } from "@/lib/atlas/graph";

describe("atlas graph", () => {
  const edges = [{ id: "1", from: "a", to: "b", type: "supply" as const }, { id: "2", from: "b", to: "c", type: "integrate" as const }];
  it("returns one-hop upstream and downstream nodes", () => expect(getNeighborhood("b", edges)).toEqual(new Set(["a", "b", "c"])));
  it("places ranks from left to right", () => expect(layoutByRank(["a", "b", "c"], edges).map((n) => n.x)).toEqual([0, 240, 480]));
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/graph.test.ts`

Expected: FAIL because graph helpers do not exist.

- [ ] **Step 3: Implement pure graph functions**

Implement `getNeighborhood(nodeId, edges)`, `filterEdgesByMode(edges, mode)`, and `layoutByRank(nodeIds, edges)`. `layoutByRank` must use a stable topological rank, `x = rank * 240`, and deterministic `y = siblingIndex * 96`; cycles fall back to the prior rank instead of looping.

- [ ] **Step 4: Run graph tests**

Run: `npm test -- tests/graph.test.ts`

Expected: PASS with stable coordinates.

- [ ] **Step 5: Commit**

```bash
git add lib/atlas/graph.ts tests/graph.test.ts
git commit -m "feat: add deterministic atlas graph queries"
```

### Task 5: Add shareable URL state

**Files:**
- Create: `lib/atlas/query-state.ts`
- Create: `tests/query-state.test.ts`

- [ ] **Step 1: Write failing query-state tests**

```ts
import { describe, expect, it } from "vitest";
import { parseAtlasQuery, serializeAtlasQuery } from "@/lib/atlas/query-state";

it("uses safe defaults for unknown values", () => expect(parseAtlasQuery(new URLSearchParams("layer=bad&mode=bad"))).toMatchObject({ layer: "interconnect", mode: "supply" }));
it("round trips a selected company", () => {
  const state = { layer: "interconnect" as const, mode: "all" as const, node: "cpo", company: "broadcom", search: "" };
  expect(parseAtlasQuery(serializeAtlasQuery(state))).toEqual(state);
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/query-state.test.ts`

Expected: FAIL because URL state helpers do not exist.

- [ ] **Step 3: Implement strict parsing and serialization**

Export `AtlasQueryState`, `parseAtlasQuery`, and `serializeAtlasQuery`. Only accept the seven layer values and `supply | value | all`; default to `interconnect` and `supply`; trim search to 80 characters; omit empty query keys.

- [ ] **Step 4: Run query-state tests and commit**

Run: `npm test -- tests/query-state.test.ts`

Expected: PASS.

```bash
git add lib/atlas/query-state.ts tests/query-state.test.ts
git commit -m "feat: add shareable atlas query state"
```

### Task 6: Build the relationship canvas and responsive research shell

**Files:**
- Create: `components/atlas/atlas-app.tsx`
- Create: `components/atlas/atlas-header.tsx`
- Create: `components/atlas/layer-nav.tsx`
- Create: `components/atlas/relationship-canvas.tsx`
- Create: `components/atlas/node-drawer.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create: `tests/atlas-app.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AtlasApp } from "@/components/atlas/atlas-app";
import { verticalSlice } from "@/content/seed/vertical-slice";

describe("AtlasApp", () => {
  it("opens CPO details and highlights its neighborhood", () => {
    render(<AtlasApp initialSnapshot={verticalSlice} />);
    fireEvent.click(screen.getByRole("button", { name: /CPO/ }));
    expect(screen.getByRole("dialog", { name: /CPO/ })).toBeInTheDocument();
    expect(screen.getByTestId("node-optical-engine")).toHaveAttribute("data-related", "true");
  });
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `npm test -- tests/atlas-app.test.tsx`

Expected: FAIL because atlas components are missing.

- [ ] **Step 3: Implement the accessible component boundaries**

`AtlasApp` owns parsed URL state and composes focused child components. `RelationshipCanvas` renders a single SVG with arrow markers, node `<button>` overlays or accessible SVG groups, and `data-related` attributes. `NodeDrawer` uses `role="dialog"`, `aria-modal="false"`, a labelled close button, and Escape handling. Do not fetch data inside presentational components.

- [ ] **Step 4: Implement the approved visual tokens**

In `app/globals.css`, define exact tokens:

```css
:root {
  --atlas-bg: #0c1822;
  --atlas-panel: #0e1c27;
  --atlas-line: #29404d;
  --atlas-text: #eaf0f4;
  --atlas-muted: #78909e;
  --atlas-accent: #d58b48;
  --atlas-paper: #f1f0ea;
  --atlas-ink: #1c2a33;
}
```

Use a three-column desktop shell (`180px minmax(640px, 1fr) 340px`). Below 900px, collapse navigation into a top filter control; below 640px, give the canvas a 760px minimum internal width with horizontal scrolling and render the drawer as a fixed bottom sheet.

- [ ] **Step 5: Connect the server page to the repository**

```tsx
// app/page.tsx
import { AtlasApp } from "@/components/atlas/atlas-app";
import { fixtureAtlasRepository } from "@/lib/atlas/repository";

export default async function HomePage() {
  const snapshot = await fixtureAtlasRepository.getSnapshot();
  return <AtlasApp initialSnapshot={snapshot} />;
}
```

- [ ] **Step 6: Run unit tests, typecheck and build**

Run: `npm test && npm run typecheck && npm run build`

Expected: all tests pass and the production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add app components tests/atlas-app.test.tsx
git commit -m "feat: render interactive industry relationship map"
```

### Task 7: Add company details, market cache semantics and evidence display

**Files:**
- Create: `components/atlas/company-drawer.tsx`
- Create: `lib/atlas/market.ts`
- Create: `tests/market.test.ts`
- Modify: `components/atlas/node-drawer.tsx`
- Modify: `components/atlas/atlas-app.tsx`

- [ ] **Step 1: Write failing market-format tests**

```ts
import { describe, expect, it } from "vitest";
import { presentMarketSnapshot } from "@/lib/atlas/market";

it("shows N/A for non-positive earnings", () => {
  expect(presentMarketSnapshot({ price: 10, ttmEps: -1, ttmPe: null, delayMinutes: 15 })).toMatchObject({ pe: "N/A", freshness: "延迟 15 分钟" });
});
it("labels cached data with its timestamp", () => {
  expect(presentMarketSnapshot({ price: 10, ttmEps: 2, ttmPe: 5, delayMinutes: 0, cachedAt: "2026-06-30T02:00:00Z" }).freshness).toContain("缓存");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/market.test.ts`

Expected: FAIL because market presentation does not exist.

- [ ] **Step 3: Implement market semantics and company drawer**

`presentMarketSnapshot` must never derive a negative PE, must include currency, and must distinguish `实时`, `延迟 N 分钟`, `最近收盘`, and `缓存至 <timestamp>`. `CompanyDrawer` shows company role, linked nodes, latest cached price, TTM PE or `N/A`, and supply evidence grouped by status. `market_speculation` relations are hidden unless the user explicitly enables them.

- [ ] **Step 4: Run tests and perform the drawer interaction**

Run: `npm test && npm run typecheck`

Expected: PASS. Clicking `AVGO` in the CPO node drawer opens Broadcom company details without losing the selected CPO URL state.

- [ ] **Step 5: Commit**

```bash
git add components/atlas/company-drawer.tsx components/atlas/node-drawer.tsx components/atlas/atlas-app.tsx lib/atlas/market.ts tests/market.test.ts
git commit -m "feat: add sourced company research drawer"
```

### Task 8: Create the PostgreSQL schema and read-only API boundary

**Files:**
- Create: `supabase/migrations/202606300001_atlas_core.sql`
- Create: `app/api/atlas/route.ts`
- Create: `tests/api-atlas.test.ts`

- [ ] **Step 1: Write the failing API test**

Mock `AtlasRepository` and assert that `GET /api/atlas?layer=interconnect` returns status 200, a parsed snapshot, `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`, and no service-role key.

- [ ] **Step 2: Run the API test and confirm failure**

Run: `npm test -- tests/api-atlas.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Add normalized tables, constraints and indexes**

The migration must create the nine tables named in the design spec, UUID primary keys, unique provider symbol constraints, foreign keys, `valid_from`/`valid_to` on supply relations, unique snapshot keys `(company_id, provider, traded_at)`, and indexes for node layer, company ticker, supplier, customer and snapshot recency.

Enable RLS on all public tables. Add `SELECT` policies for `anon` on published nodes, companies, roles, edges, non-speculative relations, evidence, snapshots and sources. Do not grant browser-side writes. Service-role writes remain server-only.

- [ ] **Step 4: Implement the read-only route**

Parse `layer` with the same enum as query state, read through the repository interface, filter nodes and related edges without mutating the snapshot, and set the cache header from Step 1. Return a structured 400 response for invalid query values.

- [ ] **Step 5: Run tests, typecheck and SQL lint check**

Run: `npm test && npm run typecheck`

Expected: PASS. Also run the migration against a local Supabase instance when Docker is available; otherwise record that integration check for Plan 4 before production deployment.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/202606300001_atlas_core.sql app/api/atlas/route.ts tests/api-atlas.test.ts
git commit -m "feat: add atlas database and read API"
```

### Task 9: Verify the vertical slice in desktop and mobile browsers

**Files:**
- Create: `tests/e2e/atlas.spec.ts`
- Modify: `playwright.config.ts`
- Create: `docs/verification/2026-06-30-vertical-slice.md`

- [ ] **Step 1: Add end-to-end acceptance checks**

```ts
import { test, expect } from "@playwright/test";

test("explores CPO and opens a company", async ({ page }) => {
  await page.goto("/?layer=interconnect&node=cpo");
  await expect(page.getByRole("dialog", { name: /CPO/ })).toBeVisible();
  await page.getByRole("button", { name: /AVGO/ }).click();
  await expect(page.getByRole("dialog", { name: /Broadcom/ })).toContainText(/TTM PE|N\/A/);
  await expect(page).toHaveURL(/node=cpo/);
});

test("mobile exposes filters and a bottom sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /筛选/ }).click();
  await expect(page.getByRole("navigation", { name: /产业层级/ })).toBeVisible();
  await page.getByRole("button", { name: /CPO/ }).click();
  await expect(page.getByRole("dialog", { name: /CPO/ })).toBeVisible();
});
```

- [ ] **Step 2: Run all automated verification**

Run: `npm test && npm run typecheck && npm run build && npm run test:e2e`

Expected: unit tests, typecheck, production build and both browser tests pass.

- [ ] **Step 3: Perform visual and interaction QA in the in-app browser**

Check desktop at 1440×900 and mobile at 390×844. Compare the implementation with the approved relationship mockup for: first-viewport hierarchy, deep-blue palette, amber selected path, off-white drawer, node density, arrow direction, CPO image frame, typography, horizontal canvas behavior and mobile bottom-sheet behavior.

- [ ] **Step 4: Record the fidelity ledger**

Create `docs/verification/2026-06-30-vertical-slice.md` with a table containing `comparison point`, `concept evidence`, `render evidence`, `mismatch`, and `fix`. Record the browser URL, viewport sizes, screenshot paths, above-the-fold copy diff, core interaction result and any intentional deviations.

- [ ] **Step 5: Run repository and directory checks**

Run: `git diff --check && git status --short && find .. -maxdepth 2 -print | sort`

Expected: no whitespace errors, only intentional files present, and the atlas project appears as a child repository of `money`.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/atlas.spec.ts playwright.config.ts docs/verification/2026-06-30-vertical-slice.md
git commit -m "test: verify atlas vertical slice"
```

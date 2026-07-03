# Investment Company Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an investment-oriented company coverage layer for AI industry subnodes, then seed the first batch for materials, equipment, and optical interconnect.

**Architecture:** Extend the atlas snapshot schema with `subnodeCompanyCoverages` that maps `stageId/groupId/subnodeId` to ranked company coverage records. Keep current `AtlasNode` deep nodes unchanged, and let node library/company pages consume the coverage layer for investment-oriented company display. Data quality is enforced through schema validation, stage-map reference validation, evidence levels, and coverage ranking constraints.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, Vitest, Testing Library.

---

### Task 1: Coverage Schema and Validation

**Files:**
- Modify: `lib/atlas/schema.ts`
- Modify: `content/seed/vertical-slice.ts`
- Test: `tests/atlas-schema.test.ts`

- [ ] **Step 1: Add failing schema tests**

Add tests that expect `verticalSlice.subnodeCompanyCoverages` to exist, every coverage to reference known company/source/stage/subnode IDs, no duplicate company per subnode, no duplicate rank per subnode, and no `leader` coverage with `evidenceLevel=D` or `relevance=indirect`.

- [ ] **Step 2: Run schema tests**

Run: `npm run test -- tests/atlas-schema.test.ts`

Expected: FAIL because `subnodeCompanyCoverages` is missing.

- [ ] **Step 3: Implement schema**

Add `SubnodeCompanyCoverage` with fields:

```ts
id
stageId
groupId
subnodeId
companyId
rank
priority: "leader" | "important" | "supplementary" | "watch"
relevance: "direct" | "adjacent" | "indirect"
evidenceLevel: "A" | "B" | "C" | "D"
role
marketShareNote?
marketCapNote?
sourceIds
```

Add `subnodeCompanyCoverages` to `atlasSnapshotSchema` and validate references.

- [ ] **Step 4: Add empty seed field**

Add `subnodeCompanyCoverages: []` to `verticalSlice`.

- [ ] **Step 5: Verify schema tests pass**

Run: `npm run test -- tests/atlas-schema.test.ts`

Expected: PASS.

### Task 2: Repository/API Coverage Plumbing

**Files:**
- Modify: `lib/atlas/repository.ts`
- Modify: `app/api/atlas/route.ts` if needed by current repository shape
- Test: `tests/repository.test.ts`
- Test: `tests/api-atlas.test.ts`

- [ ] **Step 1: Add failing repository/API tests**

Assert repository/API snapshots include `subnodeCompanyCoverages`.

- [ ] **Step 2: Run tests**

Run: `npm run test -- tests/repository.test.ts tests/api-atlas.test.ts`

Expected: FAIL if plumbing is incomplete.

- [ ] **Step 3: Implement minimal plumbing**

Keep repository/API returning full parsed snapshot including the new field.

- [ ] **Step 4: Verify**

Run: `npm run test -- tests/repository.test.ts tests/api-atlas.test.ts`

Expected: PASS.

### Task 3: Node Library and Company Page Display

**Files:**
- Modify: `components/atlas/atlas-app.tsx`
- Modify: `components/atlas/three-layer-atlas-canvas.tsx`
- Modify: `app/globals.css`
- Test: `tests/atlas-app.test.tsx`

- [ ] **Step 1: Add failing component tests**

Add tests that:

- node library detail for a covered subnode shows ranked companies, priority, relevance, and evidence level;
- node card shows top companies and coverage status;
- company page shows coverage count and leader-node count.

- [ ] **Step 2: Run component test**

Run: `npm run test -- tests/atlas-app.test.tsx`

Expected: FAIL because coverage is not rendered.

- [ ] **Step 3: Implement UI plumbing**

Pass `subnodeCompanyCoverages` into `ThreeLayerAtlasCanvas`, derive selected subnode coverages, sort by `rank`, and show:

- card: top 3 company names and status `已覆盖 / 弱覆盖 / 待补`;
- detail: ranked company list with role, priority, relevance, evidence level, and source links;
- company page: coverage count and leader count.

- [ ] **Step 4: Verify component tests**

Run: `npm run test -- tests/atlas-app.test.tsx`

Expected: PASS.

### Task 4: First-Batch Evidence Collection and Seed Data

**Files:**
- Modify: `content/seed/vertical-slice.ts`
- Test: `tests/atlas-schema.test.ts`
- Test: `tests/atlas-app.test.tsx`

- [ ] **Step 1: Collect evidence**

Use official company pages, annual reports, exchange disclosures, or investor materials for first-batch modules:

- materials
- equipment
- optical interconnect

Record sources in `sources` with `checkedAt`.

- [ ] **Step 2: Add first-batch companies**

Add missing A-share/HK/US/global companies required by coverage records.

- [ ] **Step 3: Add coverage records**

For each covered subnode, add ranked coverage records with:

- A-share/HK prioritized where credible;
- overseas global leaders as supplementary or benchmark names;
- no weak concept company as `leader`;
- `sourceIds` populated.

- [ ] **Step 4: Verify data constraints**

Run: `npm run test -- tests/atlas-schema.test.ts tests/atlas-app.test.tsx`

Expected: PASS.

### Task 5: Final Verification and Browser Check

**Files:**
- No new files.

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 2: Full test suite**

Run: `npm run test`

Expected: PASS.

- [ ] **Step 3: Browser verification**

Open latest local preview and verify:

- `?view=nodes&stage=materials` shows covered company names on selected subnodes;
- `?view=nodes&stage=equipment` shows equipment coverage instead of only concept nodes;
- `?view=companies` shows coverage counts;
- existing main canvas remains stable.

Expected: pages render without console errors or broken navigation.

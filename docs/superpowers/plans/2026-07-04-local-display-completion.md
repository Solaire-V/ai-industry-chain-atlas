# Local Display Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the local, read-only display experience before public deployment by making every existing workspace page usable rather than placeholder-like.

**Architecture:** Keep one shared atlas snapshot as the source of truth. Extend market snapshot presentation to include local valuation fields, then split the remaining placeholder workspace pages into focused React panels for market data, supply relationships, and data status. No secrets, no production database writes, and no deployment.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Vitest, Testing Library.

---

## Scope

### Implement now

- `行情数据`: high-density company market table using current snapshot data, with clear missing/fresh/stale status.
- `供需关系`: company-level supply relation table plus industry edge table with company/node/source names.
- `数据设置`: local data readiness/status page showing data source mode, update framework, status API, and deployment blockers.
- Market snapshot schema/presentation fields for `marketCap`, `pb`, `ps`, and `turnover`.

### Not implemented now

- No real market provider.
- No `.env` edits.
- No database migration execution.
- No cron registration.
- No public deployment.

## Files

- Modify: `lib/atlas/schema.ts`
- Modify: `lib/atlas/market.ts`
- Modify: `lib/atlas/supabase-repository.ts`
- Modify: `lib/atlas/supabase-seed-sql.ts`
- Modify: `components/atlas/company-library-panel.tsx`
- Modify: `components/atlas/three-layer-atlas-canvas.tsx`
- Create: `components/atlas/market-data-panel.tsx`
- Create: `components/atlas/supply-relations-panel.tsx`
- Create: `components/atlas/data-settings-panel.tsx`
- Modify: `app/globals.css`
- Modify: `tests/market.test.ts`
- Modify: `tests/atlas-schema.test.ts`
- Modify: `tests/atlas-app.test.tsx`

## Tasks

### Task 1: Market valuation fields

- [ ] Add failing tests that `marketSnapshotSchema` accepts nonnegative `marketCap`/`turnover` and positive `pb`/`ps`, and rejects invalid values.
- [ ] Add failing tests that `presentMarketSnapshot` displays market cap, PB, PS, and turnover without leaking `N/A` when fields exist.
- [ ] Implement schema and presenter changes.
- [ ] Update Supabase row mapping and seed SQL field mapping.

### Task 2: Market data workspace

- [ ] Update component tests so `view=markets` expects a market status strip and a company market table instead of placeholder cards.
- [ ] Create `components/atlas/market-data-panel.tsx`.
- [ ] Replace the `view === "markets"` branch in `WorkspaceDataPanel`.

### Task 3: Supply relationships workspace

- [ ] Update component tests so `view=supply` expects company-level supplier/customer rows and industry edge rows.
- [ ] Create `components/atlas/supply-relations-panel.tsx`.
- [ ] Replace the `view === "supply"` branch in `WorkspaceDataPanel`.

### Task 4: Data settings workspace

- [ ] Add component tests so `view=settings` shows local data readiness, status API, update framework, and deployment blockers.
- [ ] Create `components/atlas/data-settings-panel.tsx`.
- [ ] Replace the settings fallback branch in `WorkspaceDataPanel`.

### Task 5: Verification

- [ ] Run targeted tests for market and workspace pages.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Run `git status --short --branch`.

## Self-review

- Spec coverage: all six navigation pages become locally useful before deployment. Canvas, node library, and company library already have dedicated UX; this plan targets the remaining three workspace pages.
- Placeholder scan: “待配置” and generic placeholder cards are removed from user-facing local pages where a useful status or table can be shown.
- Type consistency: market snapshot optional fields use camelCase in app data and snake_case in Supabase update/seed rows.

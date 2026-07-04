# Company Library Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the non-destructive foundation for daily market updates and public deployment readiness without writing secrets, running production migrations, or deploying the site.

**Architecture:** Keep the public app read-only by default. Add server-side update orchestration that can later run from Vercel Cron or another trusted scheduler, while today only exposing tested library functions and read-only freshness status. Store deployment instructions and required environment variables in docs, not `.env`.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Supabase Postgres.

---

## Scope

### Implement now

- Market snapshot update model and persistence helper with mockable Supabase client.
- Data freshness view model for public status and company library display.
- Read-only `/api/atlas/status` endpoint backed by the shared atlas repository.
- Deployment runbook describing Vercel + Supabase setup, required env vars, cron route design, and manual safety checks.

### Explicitly not implemented now

- No `.env` edits.
- No real market data provider.
- No production DB migration execution.
- No public deployment.
- No cron registration on Vercel.

## Files

- Create: `lib/atlas/data-freshness.ts`
- Create: `lib/atlas/market-update.ts`
- Create: `app/api/atlas/status/route.ts`
- Create: `docs/roadmap/2026-07-04_phase3_deployment_runbook.md`
- Modify: `components/atlas/company-library-panel.tsx`
- Modify: `tests/atlas-app.test.tsx`
- Create: `tests/data-freshness.test.ts`
- Create: `tests/market-update.test.ts`
- Create: `tests/api-atlas-status.test.ts`

## Tasks

### Task 1: Freshness model

- [ ] Write failing tests in `tests/data-freshness.test.ts`:
  - Latest market snapshot is selected per company by `tradedAt`.
  - Empty market data returns stable counts and `null` timestamps.
  - Freshness bucket labels distinguish fresh, stale, and missing data.
- [ ] Implement `lib/atlas/data-freshness.ts`:
  - `selectLatestMarketSnapshots(snapshot)`
  - `buildAtlasDataFreshness(snapshot, now)`
  - stable output for UI and API.
- [ ] Run `npm run test -- tests/data-freshness.test.ts`.

### Task 2: Market update persistence framework

- [ ] Write failing tests in `tests/market-update.test.ts`:
  - Valid quotes are converted to `market_snapshots` upsert rows.
  - Missing quote fields are rejected before persistence.
  - Successful refresh writes an `update_runs` success record.
  - Failed refresh writes an `update_runs` failure record without leaking secrets.
- [ ] Implement `lib/atlas/market-update.ts`:
  - `MarketQuote`
  - `MarketDataProvider`
  - `runMarketSnapshotUpdate`
  - mockable minimal Supabase writer interface.
- [ ] Run `npm run test -- tests/market-update.test.ts`.

### Task 3: Read-only status API

- [ ] Write failing tests in `tests/api-atlas-status.test.ts`:
  - `GET /api/atlas/status` returns freshness summary.
  - Response has public cache headers.
  - Response body does not include service role env var values.
- [ ] Implement `app/api/atlas/status/route.ts` using `atlasRepository` and `buildAtlasDataFreshness`.
- [ ] Run `npm run test -- tests/api-atlas-status.test.ts`.

### Task 4: Company library freshness display

- [ ] Update `tests/atlas-app.test.tsx` to assert the company library shows compact market data freshness copy.
- [ ] Update `components/atlas/company-library-panel.tsx` so the page shows a compact freshness strip instead of long placeholder copy.
- [ ] Run `npm run test -- tests/atlas-app.test.tsx`.

### Task 5: Deployment runbook

- [ ] Write `docs/roadmap/2026-07-04_phase3_deployment_runbook.md` covering:
  - Vercel + Supabase recommended path.
  - Required environment variables without values.
  - Migration and seed import commands as manual steps.
  - Cron route shape and authorization requirements.
  - Pre-deploy verification checklist.
  - Rollback checklist.
- [ ] Confirm the runbook does not contain secrets or real tokens.

### Task 6: Final verification

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Run `git status --short --branch`.

## Self-review

- Spec coverage: daily update framework, latest data status, public deployment readiness, and no-secret boundary are covered. Real provider selection and real deployment remain blocked by explicit user authorization and external credentials.
- Placeholder scan: no implementation task depends on an unspecified function name; real provider choice is intentionally out of scope.
- Type consistency: public snapshot data remains `AtlasSnapshot`; market update writes database-shaped rows through a small interface rather than coupling UI code to Supabase table fields.

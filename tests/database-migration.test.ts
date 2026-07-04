import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationDir = join(process.cwd(), "supabase", "migrations");

const readMigrations = () =>
  readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(migrationDir, file), "utf8"))
    .join("\n");

describe("atlas database migrations", () => {
  it("includes the phase-two company library tables", () => {
    const sql = readMigrations();

    for (const table of [
      "company_aliases",
      "subnode_company_coverages",
      "subnode_company_coverage_sources",
      "update_runs",
    ]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("extends market snapshots for investment metrics and data provenance", () => {
    const sql = readMigrations();

    for (const column of [
      "market_cap",
      "pb",
      "ps",
      "turnover",
      "source_id",
    ]) {
      expect(sql).toContain(
        `alter table public.market_snapshots add column if not exists ${column}`,
      );
    }
  });

  it("adds stable slugs to relationship tables that need idempotent seed imports", () => {
    const sql = readMigrations();

    expect(sql).toContain(
      "alter table public.company_node_roles add column if not exists slug text",
    );
    expect(sql).toContain(
      "create unique index if not exists company_node_roles_slug_unique_idx",
    );
    expect(sql).toMatch(
      /create unique index if not exists company_node_roles_slug_unique_idx\s+on public\.company_node_roles \(slug\);/,
    );
    expect(sql).toContain(
      "alter table public.supply_relations add column if not exists slug text",
    );
    expect(sql).toContain(
      "create unique index if not exists supply_relations_slug_unique_idx",
    );
    expect(sql).toMatch(
      /create unique index if not exists supply_relations_slug_unique_idx\s+on public\.supply_relations \(slug\);/,
    );
  });

  it("indexes the company library lookup paths used by public read queries", () => {
    const sql = readMigrations();

    for (const indexName of [
      "company_aliases_company_idx",
      "company_aliases_alias_idx",
      "subnode_company_coverages_subnode_rank_idx",
      "subnode_company_coverages_company_idx",
      "subnode_company_coverage_sources_source_idx",
      "update_runs_job_recency_idx",
      "market_snapshots_source_idx",
    ]) {
      expect(sql).toContain(`create index if not exists ${indexName}`);
    }
  });
});

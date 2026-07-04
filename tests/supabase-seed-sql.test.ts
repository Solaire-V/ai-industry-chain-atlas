import { describe, expect, it } from "vitest";

import { verticalSlice } from "@/content/seed/vertical-slice";
import { buildSupabaseSeedSql } from "@/lib/atlas/supabase-seed-sql";

describe("supabase seed sql", () => {
  it("exports the current static atlas snapshot into all database tables used by phase two", () => {
    const sql = buildSupabaseSeedSql(verticalSlice);

    for (const table of [
      "public.sources",
      "public.companies",
      "public.company_aliases",
      "public.industry_nodes",
      "public.company_node_roles",
      "public.industry_edges",
      "public.supply_relations",
      "public.relation_evidence",
      "public.market_snapshots",
      "public.subnode_company_coverages",
      "public.subnode_company_coverage_sources",
    ]) {
      expect(sql).toContain(`insert into ${table}`);
    }
  });

  it("keeps seed imports idempotent by using slug conflict keys", () => {
    const sql = buildSupabaseSeedSql(verticalSlice);

    expect(sql).toContain("on conflict (slug) do update");
    expect(sql).toContain("company_node_roles_slug_unique_idx");
    expect(sql).toContain("supply_relations_slug_unique_idx");
    expect(sql).toContain("market_cap");
    expect(sql).toContain("turnover");
    expect(sql).toContain("on conflict (company_id, alias, alias_type)");
    expect(sql).toContain("on conflict (coverage_id, source_id) do nothing");
  });

  it("uses slug joins for foreign keys instead of hard-coded UUIDs", () => {
    const sql = buildSupabaseSeedSql(verticalSlice);

    expect(sql).toContain("join public.companies company on company.slug = seed.company_slug");
    expect(sql).toContain("join public.industry_nodes node on node.slug = seed.node_slug");
    expect(sql).toContain("join public.sources source on source.slug = seed.source_slug");
    expect(sql).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  it("contains every current company, node, role, supply relation, and subnode coverage slug", () => {
    const sql = buildSupabaseSeedSql(verticalSlice);

    for (const company of verticalSlice.companies) {
      expect(sql).toContain(`'${company.id}'`);
    }
    for (const node of verticalSlice.nodes) {
      expect(sql).toContain(`'${node.id}'`);
    }
    for (const role of verticalSlice.companyNodeRoles) {
      expect(sql).toContain(`'${role.id}'`);
    }
    for (const relation of verticalSlice.supplyRelations) {
      expect(sql).toContain(`'${relation.id}'`);
    }
    for (const coverage of verticalSlice.subnodeCompanyCoverages) {
      expect(sql).toContain(`'${coverage.id}'`);
    }
  });

  it("escapes SQL literals from source data", () => {
    const sql = buildSupabaseSeedSql({
      ...verticalSlice,
      sources: verticalSlice.sources.map((source, index) =>
        index === 0 ? { ...source, title: "O'Reilly AI report" } : source,
      ),
    });

    expect(sql).toContain("'O''Reilly AI report'");
  });
});

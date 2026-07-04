import { describe, expect, it } from "vitest";

import { createAtlasRepository } from "@/lib/atlas/repository";
import { mapSupabaseRowsToAtlasSnapshot } from "@/lib/atlas/supabase-repository";

const rows = {
  sources: [
    {
      id: "source-uuid-node",
      slug: "source-node",
      title: "Node Source",
      url: "https://example.com/node",
      publisher: "Example",
      published_at: "2026-01-01",
      checked_at: "2026-07-04T00:00:00.000Z",
    },
    {
      id: "source-uuid-role",
      slug: "source-role",
      title: "Role Source",
      url: "https://example.com/role",
      publisher: "Example",
      published_at: null,
      checked_at: "2026-07-04T00:00:00.000Z",
    },
    {
      id: "source-uuid-coverage",
      slug: "source-coverage",
      title: "Coverage Source",
      url: "https://example.com/coverage",
      publisher: "Example",
      published_at: null,
      checked_at: "2026-07-04T00:00:00.000Z",
    },
    {
      id: "source-uuid-supply",
      slug: "source-supply",
      title: "Supply Source",
      url: "https://example.com/supply",
      publisher: "Example",
      published_at: null,
      checked_at: "2026-07-04T00:00:00.000Z",
    },
  ],
  companies: [
    {
      id: "company-uuid-broadcom",
      slug: "broadcom",
      name: "博通",
      ticker: "AVGO",
      exchange: "NASDAQ",
      market: "US",
      currency: "USD",
    },
    {
      id: "company-uuid-nvidia",
      slug: "nvidia",
      name: "英伟达",
      ticker: "NVDA",
      exchange: "NASDAQ",
      market: "US",
      currency: "USD",
    },
  ],
  industryNodes: [
    {
      id: "node-uuid-cpo",
      slug: "cpo",
      layer: "interconnect",
      kind: "component",
      name: "共封装光学",
      english_name: "Co-Packaged Optics",
      summary: "CPO 测试节点摘要",
      technology: "CPO 测试节点技术说明，长度满足运行时 schema 校验。",
      barriers: ["封装集成"],
      drivers: ["AI 集群带宽"],
      risks: ["量产节奏"],
    },
  ],
  companyNodeRoles: [
    {
      id: "role-uuid-broadcom-cpo",
      slug: "role-broadcom-cpo",
      company_id: "company-uuid-broadcom",
      node_id: "node-uuid-cpo",
      role: "CPO 方案供应商",
      product: "CPO",
    },
    {
      id: "role-uuid-nvidia-cpo",
      slug: "role-nvidia-cpo",
      company_id: "company-uuid-nvidia",
      node_id: "node-uuid-cpo",
      role: "交换平台客户",
      product: "Spectrum-X",
    },
  ],
  industryEdges: [],
  relationEvidence: [
    {
      source_id: "source-uuid-node",
      industry_node_id: "node-uuid-cpo",
      company_node_role_id: null,
      supply_relation_id: null,
      evidence_type: "node",
    },
    {
      source_id: "source-uuid-role",
      industry_node_id: null,
      company_node_role_id: "role-uuid-broadcom-cpo",
      supply_relation_id: null,
      evidence_type: "company_node_role",
    },
    {
      source_id: "source-uuid-role",
      industry_node_id: null,
      company_node_role_id: "role-uuid-nvidia-cpo",
      supply_relation_id: null,
      evidence_type: "company_node_role",
    },
    {
      source_id: "source-uuid-supply",
      industry_node_id: null,
      company_node_role_id: null,
      supply_relation_id: "supply-uuid-broadcom-nvidia",
      evidence_type: "supply_relation",
    },
  ],
  supplyRelations: [
    {
      id: "supply-uuid-broadcom-nvidia",
      slug: "broadcom-nvidia-cpo",
      supplier_company_id: "company-uuid-broadcom",
      customer_company_id: "company-uuid-nvidia",
      node_id: "node-uuid-cpo",
      product: "CPO 交换平台",
      status: "company_confirmed",
      announced_at: "2026-01-02",
    },
  ],
  marketSnapshots: [
    {
      company_id: "company-uuid-broadcom",
      price: 200,
      change_pct: 2,
      currency: "USD",
      traded_at: "2026-07-01T03:00:00.000Z",
      fetched_at: "2026-07-01T03:01:00.000Z",
      delay_minutes: 15,
      ttm_eps: 4,
      ttm_pe: 50,
      market_cap: 1_000_000_000,
      pb: 10,
      ps: 8,
      turnover: 50_000_000,
      freshness_source: "delayed",
      cached_at: null,
      error: null,
    },
  ],
  subnodeCompanyCoverages: [
    {
      id: "coverage-uuid-cpo-broadcom",
      slug: "coverage-cpo-broadcom",
      stage_id: "optical-interconnect",
      group_id: "optical-products",
      subnode_id: "cpo-node",
      company_id: "company-uuid-broadcom",
      rank: 1,
      priority: "leader",
      relevance: "direct",
      evidence_level: "B",
      role: "CPO 龙头 / 代表公司",
      market_share_note: "测试市占说明",
      market_cap_note: "测试市值说明",
    },
  ],
  subnodeCompanyCoverageSources: [
    {
      coverage_id: "coverage-uuid-cpo-broadcom",
      source_id: "source-uuid-coverage",
    },
  ],
};

describe("supabase atlas repository mapping", () => {
  it("maps database UUID rows into slug-based atlas snapshot IDs", () => {
    const snapshot = mapSupabaseRowsToAtlasSnapshot(rows);

    expect(snapshot.sources.map(({ id }) => id)).toEqual([
      "source-node",
      "source-role",
      "source-coverage",
      "source-supply",
    ]);
    expect(snapshot.companies.map(({ id }) => id)).toEqual([
      "broadcom",
      "nvidia",
    ]);
    expect(snapshot.nodes[0]).toMatchObject({
      id: "cpo",
      companyIds: ["broadcom", "nvidia"],
      sourceIds: ["source-node"],
    });
    expect(snapshot.companyNodeRoles[0]).toMatchObject({
      id: "role-broadcom-cpo",
      companyId: "broadcom",
      nodeId: "cpo",
      sourceIds: ["source-role"],
    });
    expect(snapshot.subnodeCompanyCoverages[0]).toMatchObject({
      id: "coverage-cpo-broadcom",
      companyId: "broadcom",
      sourceIds: ["source-coverage"],
    });
    expect(snapshot.supplyRelations[0]).toMatchObject({
      id: "broadcom-nvidia-cpo",
      supplierId: "broadcom",
      customerId: "nvidia",
      nodeId: "cpo",
      evidenceSourceIds: ["source-supply"],
    });
    expect(snapshot.marketSnapshots[0]).toMatchObject({
      companyId: "broadcom",
      price: 200,
      ttmPe: 50,
      marketCap: 1_000_000_000,
      pb: 10,
      ps: 8,
      turnover: 50_000_000,
    });
  });

  it("normalizes Supabase timestamptz offsets into atlas datetime strings", () => {
    const snapshot = mapSupabaseRowsToAtlasSnapshot({
      ...rows,
      sources: rows.sources.map((source) => ({
        ...source,
        checked_at: "2026-07-04T00:00:00+00:00",
      })),
      marketSnapshots: rows.marketSnapshots.map((marketSnapshot) => ({
        ...marketSnapshot,
        traded_at: "2026-07-01T03:00:00+00:00",
        fetched_at: "2026-07-01T03:01:00+00:00",
      })),
    });

    expect(snapshot.sources[0]?.checkedAt).toBe("2026-07-04T00:00:00.000Z");
    expect(snapshot.marketSnapshots[0]?.tradedAt).toBe(
      "2026-07-01T03:00:00.000Z",
    );
    expect(snapshot.marketSnapshots[0]?.fetchedAt).toBe(
      "2026-07-01T03:01:00.000Z",
    );
  });

  it("skips Supabase subnode coverages that are newer than the deployed stage map", () => {
    const knownCoverage = rows.subnodeCompanyCoverages[0];
    expect(knownCoverage).toBeDefined();
    if (!knownCoverage) throw new Error("missing test coverage fixture");

    const snapshot = mapSupabaseRowsToAtlasSnapshot({
      ...rows,
      subnodeCompanyCoverages: [
        ...rows.subnodeCompanyCoverages,
        {
          ...knownCoverage,
          id: "coverage-uuid-future-subnode",
          slug: "coverage-future-subnode",
          stage_id: "future-stage",
          group_id: "future-group",
          subnode_id: "future-subnode",
          rank: 1,
        },
        {
          ...knownCoverage,
          id: "coverage-uuid-future-group",
          slug: "coverage-future-group",
          group_id: "future-group",
          subnode_id: "future-subnode",
          rank: 2,
        },
        {
          ...knownCoverage,
          id: "coverage-uuid-future-node",
          slug: "coverage-future-node",
          subnode_id: "future-subnode",
          rank: 3,
        },
      ],
      subnodeCompanyCoverageSources: [
        ...rows.subnodeCompanyCoverageSources,
        {
          coverage_id: "coverage-uuid-future-subnode",
          source_id: "source-uuid-coverage",
        },
      ],
    });

    expect(snapshot.subnodeCompanyCoverages).toHaveLength(1);
    expect(snapshot.subnodeCompanyCoverages[0]?.id).toBe("coverage-cpo-broadcom");
  });

  it("keeps the fixture repository as the default data source", async () => {
    const repository = createAtlasRepository({});
    const snapshot = await repository.getSnapshot();

    expect(snapshot.companies.length).toBeGreaterThan(0);
    expect(snapshot.subnodeCompanyCoverages.length).toBeGreaterThan(0);
  });

  it("requires server-side Supabase credentials when explicitly enabled", () => {
    expect(() => createAtlasRepository({ ATLAS_DATA_SOURCE: "supabase" })).toThrow(
      /SUPABASE_URL/,
    );
  });
});

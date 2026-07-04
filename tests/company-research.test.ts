import { describe, expect, it } from "vitest";

import {
  buildCompanyResearchRows,
  getCompanyMarketLabel,
  getCompanyTickerLabel,
  isAshareCompany,
} from "@/lib/atlas/company-research";
import type {
  AtlasCompany,
  AtlasMarketSnapshot,
  AtlasSupplyRelation,
  SubnodeCompanyCoverage,
} from "@/lib/atlas/schema";

const companies: AtlasCompany[] = [
  {
    id: "us-leader",
    name: "US Leader",
    ticker: "USL",
    exchange: "NASDAQ",
    market: "US",
    currency: "USD",
  },
  {
    id: "cn-important",
    name: "A股公司",
    ticker: "688001.SH",
    exchange: "SSE STAR",
    market: "CN",
    currency: "CNY",
  },
  {
    id: "cn-multi",
    name: "多节点公司",
    ticker: "300001.SZ",
    exchange: "SZSE",
    market: "CN",
    currency: "CNY",
  },
];

const coverage = (
  id: string,
  companyId: string,
  stageId: string,
  groupId: string,
  subnodeId: string,
  rank: number,
  priority: SubnodeCompanyCoverage["priority"],
): SubnodeCompanyCoverage => ({
  id,
  companyId,
  stageId,
  groupId,
  subnodeId,
  rank,
  priority,
  relevance: "direct",
  evidenceLevel: "B",
  role: `${subnodeId} ${priority}`,
  sourceIds: [`source-${id}`],
});

describe("company research view model", () => {
  it("formats market labels and ticker labels consistently", () => {
    expect(isAshareCompany(companies[1])).toBe(true);
    expect(isAshareCompany(companies[0])).toBe(false);
    expect(getCompanyMarketLabel(companies[1])).toBe("A股");
    expect(getCompanyMarketLabel(companies[0])).toBe("美股");
    expect(getCompanyTickerLabel(companies[1])).toBe("688001.SH · SSE STAR");
  });

  it("prioritizes A-share rows and aggregates one company across multiple subnodes", () => {
    const rows = buildCompanyResearchRows({
      companies,
      subnodeCompanyCoverages: [
        coverage("us-cpo", "us-leader", "optical-interconnect", "optical-products", "cpo-node", 1, "leader"),
        coverage("cn-cpo", "cn-important", "optical-interconnect", "optical-products", "cpo-node", 2, "important"),
        coverage("multi-cpo", "cn-multi", "optical-interconnect", "optical-products", "cpo-node", 3, "supplementary"),
        coverage("multi-server", "cn-multi", "server-network", "server-systems", "ai-server-node", 1, "leader"),
      ],
      marketSnapshots: [],
      supplyRelations: [],
    });

    expect(rows.map((row) => row.company.id)).toEqual([
      "cn-multi",
      "cn-important",
      "us-leader",
    ]);
    const multi = rows[0]!;
    expect(multi.positions.map((position) => position.subnodeLabel)).toEqual([
      "AI 服务器",
      "CPO",
    ]);
    expect(multi.primaryPosition?.stageName).toBe("服务器网络");
    expect(multi.relatedNodeCount).toBe(2);
  });

  it("selects the latest market snapshot by absolute traded time", () => {
    const marketSnapshots: AtlasMarketSnapshot[] = [
      {
        companyId: "us-leader",
        price: 100,
        changePct: -1,
        currency: "USD",
        tradedAt: "2026-07-01T10:00:00+08:00",
        fetchedAt: "2026-07-01T10:01:00+08:00",
        delayMinutes: 15,
        ttmEps: 2,
        ttmPe: 50,
      },
      {
        companyId: "us-leader",
        price: 200,
        changePct: 2,
        currency: "USD",
        tradedAt: "2026-07-01T03:00:00Z",
        fetchedAt: "2026-07-01T03:01:00Z",
        delayMinutes: 15,
        ttmEps: 4,
        ttmPe: 50,
      },
    ];

    const [row] = buildCompanyResearchRows({
      companies: [companies[0]!],
      subnodeCompanyCoverages: [
        coverage("us-cpo", "us-leader", "optical-interconnect", "optical-products", "cpo-node", 1, "leader"),
      ],
      marketSnapshots,
      supplyRelations: [],
    });

    expect(row?.latestMarketSnapshot?.price).toBe(200);
    expect(row?.market.price).toBe("USD 200");
    expect(row?.market.change).toBe("+2%");
  });

  it("summarizes supplier, customer, and verified relation counts", () => {
    const supplyRelations: AtlasSupplyRelation[] = [
      {
        id: "us-to-cn",
        supplierId: "us-leader",
        customerId: "cn-important",
        nodeId: "cpo",
        product: "CPO 方案",
        status: "company_confirmed",
        evidenceSourceIds: ["source-a"],
      },
      {
        id: "multi-to-us",
        supplierId: "cn-multi",
        customerId: "us-leader",
        nodeId: "ai-server",
        product: "服务器组件",
        status: "market_speculation",
        evidenceSourceIds: ["source-b"],
      },
    ];

    const [row] = buildCompanyResearchRows({
      companies: [companies[0]!],
      subnodeCompanyCoverages: [
        coverage("us-cpo", "us-leader", "optical-interconnect", "optical-products", "cpo-node", 1, "leader"),
      ],
      marketSnapshots: [],
      supplyRelations,
    });

    expect(row?.customerCount).toBe(1);
    expect(row?.supplierCount).toBe(1);
    expect(row?.verifiedRelationCount).toBe(1);
    expect(row?.market.price).toBe("N/A");
    expect(row?.market.freshness).toBe("暂无行情数据");
  });
});

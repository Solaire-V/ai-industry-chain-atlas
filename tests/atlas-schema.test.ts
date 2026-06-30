import { describe, expect, it } from "vitest";

import {
  atlasSnapshotSchema,
  companySchema,
  marketSchema,
  nodeSchema,
  supplyRelationSchema,
  type AtlasMarket,
} from "@/lib/atlas/schema";

const materialNode = {
  id: "advanced-packaging-materials",
  layer: "materials",
  kind: "material",
  name: "先进封装材料",
  englishName: "Advanced Packaging Materials",
  summary: "为先进封装提供关键基础材料。",
  technology: "材料需要兼顾高导热、低介电损耗与长期封装可靠性。",
  barriers: ["长期客户验证周期"],
  drivers: ["AI 加速器封装需求增长"],
  risks: ["原材料供应波动"],
  companyIds: ["company-a", "company-b"],
  sourceIds: ["source-a"],
} as const;

const supplyRelation = {
  id: "relation-a",
  supplierId: "company-a",
  customerId: "company-b",
  nodeId: "advanced-packaging-materials",
  product: "封装基板",
  status: "company_confirmed",
  evidenceSourceIds: ["source-a"],
  announcedAt: "2026-06-15",
} as const;

describe("atlas domain contracts", () => {
  it("reuses the exported market schema for companies", () => {
    const market: AtlasMarket = "US";

    expect(marketSchema.parse(market)).toBe("US");
    expect(companySchema.shape.market).toBe(marketSchema);
  });

  it("rejects a material node with fewer than two distinct leaders", () => {
    const result = nodeSchema.safeParse({
      ...materialNode,
      companyIds: ["company-a"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["companyIds"],
            message: "material nodes require at least two distinct leaders",
          }),
        ]),
      );
    }
  });

  it("rejects a material node whose leader IDs are duplicates", () => {
    const result = nodeSchema.safeParse({
      ...materialNode,
      companyIds: ["company-a", "company-a"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["companyIds"],
            message: "material nodes require at least two distinct leaders",
          }),
        ]),
      );
    }
  });

  it("rejects a supply relation without evidence", () => {
    const result = supplyRelationSchema.safeParse({
      ...supplyRelation,
      evidenceSourceIds: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["evidenceSourceIds"] }),
        ]),
      );
    }
  });

  it("rejects a supply relation with a whitespace-only evidence ID", () => {
    const result = supplyRelationSchema.safeParse({
      ...supplyRelation,
      evidenceSourceIds: ["   "],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["evidenceSourceIds", 0] }),
        ]),
      );
    }
  });

  it("parses a valid minimal atlas snapshot", () => {
    const snapshot = {
      nodes: [materialNode],
      companies: [
        {
          id: "company-a",
          name: "材料公司 A",
          ticker: "MATA",
          exchange: "NASDAQ",
          market: "US",
          currency: "USD",
        },
        {
          id: "company-b",
          name: "材料公司 B",
          ticker: "MATB",
          exchange: "PRIVATE",
          market: "PRIVATE",
          currency: "CNY",
        },
      ],
      industryEdges: [
        {
          id: "edge-a",
          from: "advanced-packaging-materials",
          to: "advanced-packaging-system",
          type: "supply",
        },
      ],
      supplyRelations: [supplyRelation],
      marketSnapshots: [
        {
          companyId: "company-a",
          price: 125.5,
          changePct: -1.2,
          currency: "USD",
          tradedAt: "2026-07-01T06:30:00.000Z",
          fetchedAt: "2026-07-01T06:45:00.000Z",
          delayMinutes: 15,
          ttmEps: 3.2,
          ttmPe: 39.22,
        },
      ],
      sources: [
        {
          id: "source-a",
          title: "公司供应关系公告",
          url: "https://example.com/disclosure",
          publisher: "Example Exchange",
          publishedAt: "2026-06-15",
          checkedAt: "2026-07-01T06:45:00.000Z",
        },
      ],
    };

    expect(atlasSnapshotSchema.parse(snapshot)).toEqual(snapshot);
  });
});

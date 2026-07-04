import { describe, expect, it } from "vitest";

import {
  atlasSnapshotSchema,
  companyNodeRoleSchema,
  companySchema,
  marketSchema,
  marketSnapshotSchema,
  nodeSchema,
  subnodeCompanyCoverageSchema,
  sourceSchema,
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

const validSnapshot = {
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
  companyNodeRoles: [
    {
      id: "role-a",
      companyId: "company-a",
      nodeId: "advanced-packaging-materials",
      role: "材料供应商",
      product: "封装基板材料",
      sourceIds: ["source-a"],
    },
    {
      id: "role-b",
      companyId: "company-b",
      nodeId: "advanced-packaging-materials",
      role: "材料供应商",
      sourceIds: ["source-a"],
    },
  ],
  subnodeCompanyCoverages: [
    {
      id: "materials-silicon-wafer-company-a",
      stageId: "materials",
      groupId: "wafer-substrate",
      subnodeId: "silicon-wafer",
      companyId: "company-a",
      rank: 1,
      priority: "leader",
      relevance: "direct",
      evidenceLevel: "A",
      role: "硅片材料代表公司",
      marketShareNote: "用于验证市占、产能或客户地位说明字段。",
      marketCapNote: "用于验证市值和流动性说明字段。",
      sourceIds: ["source-a"],
    },
  ],
  industryEdges: [
    {
      id: "edge-a",
      from: "advanced-packaging-materials",
      to: "advanced-packaging-materials",
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
} as const;

const expectSnapshotIssueAt = (
  snapshot: unknown,
  path: Array<string | number>,
) => {
  const result = atlasSnapshotSchema.safeParse(snapshot);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path })]),
    );
  }
};

describe("atlas domain contracts", () => {
  it.each(["javascript:alert(1)", "data:text/plain,unsafe"])(
    "rejects unsafe source URL protocol %s",
    (url) => {
      expect(
        sourceSchema.safeParse({
          ...validSnapshot.sources[0],
          url,
        }).success,
      ).toBe(false);
    },
  );

  it("reuses the exported market schema for companies", () => {
    const market: AtlasMarket = "US";

    expect(marketSchema.parse(market)).toBe("US");
    expect(companySchema.shape.market).toBe(marketSchema);
  });

  it("preserves canonical market freshness metadata", () => {
    const parsed = marketSnapshotSchema.parse({
      ...validSnapshot.marketSnapshots[0],
      freshnessSource: "cached",
      cachedAt: "2026-07-01T07:00:00.000Z",
      error: "upstream timeout",
      marketCap: 3_000_000_000_000,
      pb: 40,
      ps: 25,
      turnover: 10_000_000_000,
    });

    expect(parsed).toMatchObject({
      freshnessSource: "cached",
      cachedAt: "2026-07-01T07:00:00.000Z",
      error: "upstream timeout",
      marketCap: 3_000_000_000_000,
      pb: 40,
      ps: 25,
      turnover: 10_000_000_000,
    });
  });

  it.each([
    ["marketCap", -1],
    ["pb", 0],
    ["ps", -1],
    ["turnover", -1],
  ] as const)("rejects invalid market metric %s", (field, value) => {
    const result = marketSnapshotSchema.safeParse({
      ...validSnapshot.marketSnapshots[0],
      [field]: value,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: [field] })]),
      );
    }
  });

  it.each([
    ["live", 15, undefined, "delayMinutes"],
    ["live", 0, "2026-07-01T07:00:00.000Z", "cachedAt"],
    ["delayed", 0, undefined, "delayMinutes"],
    ["delayed", 15, "2026-07-01T07:00:00.000Z", "cachedAt"],
    ["cached", 15, undefined, "cachedAt"],
  ] as const)(
    "rejects inconsistent %s market freshness metadata",
    (freshnessSource, delayMinutes, cachedAt, issueField) => {
      const result = marketSnapshotSchema.safeParse({
        ...validSnapshot.marketSnapshots[0],
        freshnessSource,
        delayMinutes,
        ...(cachedAt ? { cachedAt } : {}),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: [issueField] }),
          ]),
        );
      }
    },
  );

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

  it("requires evidence on a company-node role", () => {
    const result = companyNodeRoleSchema.safeParse({
      id: "role-a",
      companyId: "company-a",
      nodeId: "advanced-packaging-materials",
      role: "材料供应商",
      sourceIds: [],
    });

    expect(result.success).toBe(false);
  });

  it("requires evidence on a subnode company coverage", () => {
    const result = subnodeCompanyCoverageSchema.safeParse({
      ...validSnapshot.subnodeCompanyCoverages[0],
      sourceIds: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate entity IDs", () => {
    const result = atlasSnapshotSchema.safeParse({
      ...validSnapshot,
      companies: [validSnapshot.companies[0], validSnapshot.companies[0]],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["companies", 1, "id"] }),
        ]),
      );
    }
  });

  it("rejects dangling cross-references", () => {
    const result = atlasSnapshotSchema.safeParse({
      ...validSnapshot,
      industryEdges: [
        { ...validSnapshot.industryEdges[0], to: "missing-node" },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["industryEdges", 0, "to"] }),
        ]),
      );
    }
  });

  it("rejects a dangling node company reference", () => {
    expectSnapshotIssueAt(
      {
        ...validSnapshot,
        nodes: [
          {
            ...validSnapshot.nodes[0],
            companyIds: ["missing-company", "company-b"],
          },
        ],
      },
      ["nodes", 0, "companyIds", 0],
    );
  });

  it("rejects a dangling node source reference", () => {
    expectSnapshotIssueAt(
      {
        ...validSnapshot,
        nodes: [
          { ...validSnapshot.nodes[0], sourceIds: ["missing-source"] },
        ],
      },
      ["nodes", 0, "sourceIds", 0],
    );
  });

  it("rejects a company-node role with a dangling company", () => {
    expectSnapshotIssueAt(
      {
        ...validSnapshot,
        companyNodeRoles: [
          {
            ...validSnapshot.companyNodeRoles[0],
            companyId: "missing-company",
          },
          validSnapshot.companyNodeRoles[1],
        ],
      },
      ["companyNodeRoles", 0, "companyId"],
    );
  });

  it("rejects a company-node role with a dangling node", () => {
    expectSnapshotIssueAt(
      {
        ...validSnapshot,
        companyNodeRoles: [
          {
            ...validSnapshot.companyNodeRoles[0],
            nodeId: "missing-node",
          },
          validSnapshot.companyNodeRoles[1],
        ],
      },
      ["companyNodeRoles", 0, "nodeId"],
    );
  });

  it("rejects a role company that is absent from node.companyIds", () => {
    const companyC = {
      ...validSnapshot.companies[0],
      id: "company-c",
      ticker: "MATC",
    };
    expectSnapshotIssueAt(
      {
        ...validSnapshot,
        companies: [...validSnapshot.companies, companyC],
        companyNodeRoles: [
          {
            ...validSnapshot.companyNodeRoles[0],
            companyId: "company-c",
          },
          validSnapshot.companyNodeRoles[1],
        ],
      },
      ["companyNodeRoles", 0, "companyId"],
    );
  });

  it("rejects a dangling industry-edge endpoint", () => {
    expectSnapshotIssueAt(
      {
        ...validSnapshot,
        industryEdges: [
          { ...validSnapshot.industryEdges[0], from: "missing-node" },
        ],
      },
      ["industryEdges", 0, "from"],
    );
  });

  it.each([
    ["companyId", "missing-company", ["subnodeCompanyCoverages", 0, "companyId"]],
    ["sourceIds", ["missing-source"], ["subnodeCompanyCoverages", 0, "sourceIds", 0]],
    ["stageId", "missing-stage", ["subnodeCompanyCoverages", 0, "stageId"]],
    ["groupId", "missing-group", ["subnodeCompanyCoverages", 0, "groupId"]],
    ["subnodeId", "missing-subnode", ["subnodeCompanyCoverages", 0, "subnodeId"]],
  ] as const)(
    "rejects a subnode company coverage with dangling %s",
    (field, value, path) => {
      expectSnapshotIssueAt(
        {
          ...validSnapshot,
          subnodeCompanyCoverages: [
            { ...validSnapshot.subnodeCompanyCoverages[0], [field]: value },
          ],
        },
        [...path],
      );
    },
  );

  it("rejects duplicate company coverage for the same subnode", () => {
    expectSnapshotIssueAt(
      {
        ...validSnapshot,
        subnodeCompanyCoverages: [
          validSnapshot.subnodeCompanyCoverages[0],
          {
            ...validSnapshot.subnodeCompanyCoverages[0],
            id: "materials-silicon-wafer-company-a-duplicate",
            rank: 2,
          },
        ],
      },
      ["subnodeCompanyCoverages", 1, "companyId"],
    );
  });

  it("rejects duplicate coverage rank within the same subnode", () => {
    const companyC = {
      ...validSnapshot.companies[0],
      id: "company-c",
      ticker: "MATC",
    };
    expectSnapshotIssueAt(
      {
        ...validSnapshot,
        companies: [...validSnapshot.companies, companyC],
        subnodeCompanyCoverages: [
          validSnapshot.subnodeCompanyCoverages[0],
          {
            ...validSnapshot.subnodeCompanyCoverages[0],
            id: "materials-silicon-wafer-company-c",
            companyId: "company-c",
          },
        ],
      },
      ["subnodeCompanyCoverages", 1, "rank"],
    );
  });

  it("rejects weak or indirect coverage marked as leader", () => {
    expectSnapshotIssueAt(
      {
        ...validSnapshot,
        subnodeCompanyCoverages: [
          {
            ...validSnapshot.subnodeCompanyCoverages[0],
            evidenceLevel: "D",
          },
        ],
      },
      ["subnodeCompanyCoverages", 0, "evidenceLevel"],
    );

    expectSnapshotIssueAt(
      {
        ...validSnapshot,
        subnodeCompanyCoverages: [
          {
            ...validSnapshot.subnodeCompanyCoverages[0],
            relevance: "indirect",
          },
        ],
      },
      ["subnodeCompanyCoverages", 0, "relevance"],
    );
  });

  it.each([
    ["supplierId", "missing-company", ["supplyRelations", 0, "supplierId"]],
    ["customerId", "missing-company", ["supplyRelations", 0, "customerId"]],
    ["nodeId", "missing-node", ["supplyRelations", 0, "nodeId"]],
    [
      "evidenceSourceIds",
      ["missing-source"],
      ["supplyRelations", 0, "evidenceSourceIds", 0],
    ],
  ] as const)(
    "rejects a supply relation with dangling %s",
    (field, value, path) => {
      expectSnapshotIssueAt(
        {
          ...validSnapshot,
          supplyRelations: [
            { ...validSnapshot.supplyRelations[0], [field]: value },
          ],
        },
        [...path],
      );
    },
  );

  it("rejects a market snapshot with a dangling company", () => {
    expectSnapshotIssueAt(
      {
        ...validSnapshot,
        marketSnapshots: [
          {
            ...validSnapshot.marketSnapshots[0],
            companyId: "missing-company",
          },
        ],
      },
      ["marketSnapshots", 0, "companyId"],
    );
  });

  it("rejects a node-company association without an evidenced role", () => {
    const result = atlasSnapshotSchema.safeParse({
      ...validSnapshot,
      companyNodeRoles: [validSnapshot.companyNodeRoles[0]],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["nodes", 0, "companyIds", 1] }),
        ]),
      );
    }
  });

  it("rejects a duplicate company and traded-at market snapshot key", () => {
    const result = atlasSnapshotSchema.safeParse({
      ...validSnapshot,
      marketSnapshots: [
        validSnapshot.marketSnapshots[0],
        validSnapshot.marketSnapshots[0],
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["marketSnapshots", 1, "tradedAt"] }),
        ]),
      );
    }
  });

  it("parses a valid minimal atlas snapshot", () => {
    expect(atlasSnapshotSchema.parse(validSnapshot)).toEqual(validSnapshot);
  });
});

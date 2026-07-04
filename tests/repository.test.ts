import { describe, expect, it } from "vitest";

import { fixtureAtlasRepository } from "@/lib/atlas/repository";
import { atlasSnapshotSchema } from "@/lib/atlas/schema";
import { atlasStages } from "@/lib/atlas/stage-map";

const expectedNodeIds = [
  "inp-material",
  "silicon-photonics-material",
  "optical-fiber-preform",
  "low-loss-ccl",
  "optical-chip",
  "laser",
  "modulator",
  "tia-driver",
  "optical-dsp",
  "fa-mpo",
  "high-layer-pcb",
  "switch-asic",
  "pluggable-optics",
  "optical-engine",
  "cpo",
  "hbm",
  "ethernet-switch",
  "ai-server",
  "ai-cluster",
].sort();

describe("fixtureAtlasRepository", () => {
  it("returns the complete, referentially sound CPO vertical slice", async () => {
    const snapshot = await fixtureAtlasRepository.getSnapshot();
    expect(atlasSnapshotSchema.parse(snapshot)).toEqual(snapshot);

    expect(snapshot.nodes.map(({ id }) => id).sort()).toEqual(expectedNodeIds);
    expect(snapshot.nodes.some(({ id }) => id === "cpo")).toBe(true);

    const requiredEdges = [
      ["inp-material", "optical-chip", "supply"],
      ["optical-chip", "optical-engine", "supply"],
      ["optical-engine", "cpo", "integrate"],
      ["cpo", "ethernet-switch", "integrate"],
      ["ethernet-switch", "ai-cluster", "deploy"],
      ["low-loss-ccl", "high-layer-pcb", "supply"],
      ["high-layer-pcb", "cpo", "integrate"],
      ["switch-asic", "cpo", "integrate"],
      ["cpo", "ai-server", "deploy"],
      ["ai-server", "ai-cluster", "deploy"],
      ["hbm", "ai-server", "integrate"],
    ] as const;

    for (const [from, to, type] of requiredEdges) {
      expect(snapshot.industryEdges).toEqual(
        expect.arrayContaining([expect.objectContaining({ from, to, type })]),
      );
    }
    expect(snapshot.industryEdges).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "optical-chip", to: "laser" }),
      ]),
    );
    expect(snapshot.industryEdges).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "optical-chip", to: "modulator" }),
      ]),
    );

    const requiredTickers = {
      broadcom: "AVGO",
      marvell: "MRVL",
      coherent: "COHR",
      lumentum: "LITE",
      corning: "GLW",
      tsmc: "TSM",
      nvidia: "NVDA",
      "sk-hynix": "000660.KS",
      micron: "MU",
      "samsung-electronics": "005930.KS",
      arista: "ANET",
      fabrinet: "FN",
      "zhongji-innolight": "300308.SZ",
      eoptolink: "300502.SZ",
      "shennan-circuits": "002916.SZ",
      "victory-giant": "300476.SZ",
      "shengyi-technology": "600183.SH",
      "kingboard-laminates": "1888.HK",
    } as const;

    for (const [id, ticker] of Object.entries(requiredTickers)) {
      expect(snapshot.companies).toEqual(
        expect.arrayContaining([expect.objectContaining({ id, ticker })]),
      );
    }

    const companyIds = new Set(snapshot.companies.map(({ id }) => id));
    const nodeIds = new Set(snapshot.nodes.map(({ id }) => id));
    const sourceIds = new Set(snapshot.sources.map(({ id }) => id));

    for (const node of snapshot.nodes) {
      expect(node.sourceIds.length).toBeGreaterThanOrEqual(1);
      expect(node.sourceIds.every((id) => sourceIds.has(id))).toBe(true);
      expect(node.companyIds.every((id) => companyIds.has(id))).toBe(true);
      if (node.kind === "material") {
        expect(new Set(node.companyIds).size).toBeGreaterThanOrEqual(2);
      }
    }

    for (const edge of snapshot.industryEdges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }

    for (const relation of snapshot.supplyRelations) {
      expect(companyIds.has(relation.supplierId)).toBe(true);
      expect(companyIds.has(relation.customerId)).toBe(true);
      expect(nodeIds.has(relation.nodeId)).toBe(true);
      expect(relation.evidenceSourceIds.every((id) => sourceIds.has(id))).toBe(
        true,
      );
    }

    expect(snapshot.companyNodeRoles).toHaveLength(
      snapshot.nodes.reduce((total, node) => total + node.companyIds.length, 0),
    );
    expect(
      new Set(
        snapshot.nodes.map((node) =>
          JSON.stringify([node.barriers, node.drivers, node.risks]),
        ),
      ).size,
    ).toBe(snapshot.nodes.length);

    expect(snapshot.supplyRelations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          supplierId: "sk-hynix",
          customerId: "nvidia",
          nodeId: "hbm",
          status: "company_confirmed",
        }),
      ]),
    );
    expect(snapshot.supplyRelations.length).toBeGreaterThanOrEqual(3);

    expect(snapshot.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "marvell-optical-dsp-2024",
          title:
            "Marvell Announces Industry’s First 5nm Transmit-Only 800G PAM4 Optical DSP",
          url: "https://www.marvell.com/company/newsroom/marvell-announces-industrys-first-5nm-transmit-only-800g-pam4-optical-dsp-for-ai-and-cloud-interconnects.html",
        }),
        expect.objectContaining({
          id: "shengyi-ccl-products",
          title: "Synamic 6GX 低损耗高速覆铜板",
          url: "https://www.syst.com.cn/cn/product/info_16.aspx?itemid=5215",
        }),
      ]),
    );
  });

  it("covers every minimum stage subnode with at least one company candidate", async () => {
    const snapshot = await fixtureAtlasRepository.getSnapshot();
    const expectedSubnodeKeys = new Set(
      atlasStages.flatMap((stage) =>
        stage.groups.flatMap((group) =>
          group.nodes.map((node) => `${stage.id}\u0000${group.id}\u0000${node.id}`),
        ),
      ),
    );
    const coveredSubnodeKeys = new Set(
      snapshot.subnodeCompanyCoverages.map(
        (coverage) =>
          `${coverage.stageId}\u0000${coverage.groupId}\u0000${coverage.subnodeId}`,
      ),
    );

    expect(coveredSubnodeKeys).toEqual(expectedSubnodeKeys);
  });

  it("keeps high-frequency A-share leaders on their investment subnodes", async () => {
    const snapshot = await fixtureAtlasRepository.getSnapshot();
    const companiesByTicker = new Map(
      snapshot.companies.map((company) => [company.ticker, company]),
    );
    const coverageKeys = new Set(
      snapshot.subnodeCompanyCoverages.map(
        (coverage) => `${coverage.subnodeId}\u0000${coverage.companyId}`,
      ),
    );
    const requiredAshareCoverages = [
      ["300394.SZ", "cpo-node"],
      ["000988.SZ", "laser-node"],
      ["688205.SH", "pluggable-optics-node"],
      ["688195.SH", "ocs-node"],
      ["002463.SZ", "high-layer-pcb-node"],
      ["002384.SZ", "high-layer-pcb-node"],
      ["603228.SH", "high-layer-pcb-node"],
      ["002913.SZ", "high-layer-pcb-node"],
      ["603019.SH", "ai-server-node"],
      ["002837.SZ", "liquid-cooling-system"],
    ] as const;

    for (const [ticker, subnodeId] of requiredAshareCoverages) {
      const company = companiesByTicker.get(ticker);
      expect(company, `${ticker} should be in company master data`).toBeTruthy();
      expect(company?.market).toBe("CN");
      expect(coverageKeys.has(`${subnodeId}\u0000${company?.id}`)).toBe(true);
    }
  });

  it("covers expanded A-share investable gaps across packaging, glass substrate, and MLCC", async () => {
    const snapshot = await fixtureAtlasRepository.getSnapshot();
    const companiesByTicker = new Map(
      snapshot.companies.map((company) => [company.ticker, company]),
    );
    const coverageKeys = new Set(
      snapshot.subnodeCompanyCoverages.map(
        (coverage) => `${coverage.subnodeId}\u0000${coverage.companyId}`,
      ),
    );
    const requiredAshareCoverages = [
      ["600584.SH", "osat-advanced-packaging"],
      ["002156.SZ", "osat-advanced-packaging"],
      ["002185.SZ", "osat-advanced-packaging"],
      ["000021.SZ", "osat-advanced-packaging"],
      ["688362.SH", "wafer-level-packaging"],
      ["603005.SH", "wafer-level-packaging"],
      ["603773.SH", "glass-core-substrate"],
      ["000725.SZ", "glass-core-substrate"],
      ["300408.SZ", "mlcc"],
      ["000636.SZ", "mlcc"],
      ["300285.SZ", "mlcc"],
      ["002859.SZ", "mlcc"],
    ] as const;

    for (const [ticker, subnodeId] of requiredAshareCoverages) {
      const company = companiesByTicker.get(ticker);
      expect(company, `${ticker} should be in company master data`).toBeTruthy();
      expect(company?.market).toBe("CN");
      expect(coverageKeys.has(`${subnodeId}\u0000${company?.id}`)).toBe(true);
    }
  });

  it("covers AIDC power infrastructure with A-share investable leaders", async () => {
    const snapshot = await fixtureAtlasRepository.getSnapshot();
    const companiesByTicker = new Map(
      snapshot.companies.map((company) => [company.ticker, company]),
    );
    const coverageKeys = new Set(
      snapshot.subnodeCompanyCoverages.map(
        (coverage) => `${coverage.subnodeId}\u0000${coverage.companyId}`,
      ),
    );
    const requiredAshareCoverages = [
      ["002335.SZ", "ups-power-distribution"],
      ["002518.SZ", "ups-power-distribution"],
      ["300693.SZ", "ups-power-distribution"],
      ["600089.SH", "transformer-switchgear"],
      ["601179.SH", "transformer-switchgear"],
      ["688676.SH", "transformer-switchgear"],
      ["300274.SZ", "energy-storage-grid"],
      ["600406.SH", "energy-storage-grid"],
      ["600875.SH", "backup-generation"],
      ["601727.SH", "backup-generation"],
    ] as const;

    for (const [ticker, subnodeId] of requiredAshareCoverages) {
      const company = companiesByTicker.get(ticker);
      expect(company, `${ticker} should be in company master data`).toBeTruthy();
      expect(company?.market).toBe("CN");
      expect(coverageKeys.has(`${subnodeId}\u0000${company?.id}`)).toBe(true);
    }
  });

  it("covers high-speed copper interconnect and liquid cooling A-share watchlists", async () => {
    const snapshot = await fixtureAtlasRepository.getSnapshot();
    const companiesByTicker = new Map(
      snapshot.companies.map((company) => [company.ticker, company]),
    );
    const coverageKeys = new Set(
      snapshot.subnodeCompanyCoverages.map(
        (coverage) => `${coverage.subnodeId}\u0000${coverage.companyId}`,
      ),
    );
    const requiredAshareCoverages = [
      ["002475.SZ", "copper-cable-dac-aec"],
      ["300913.SZ", "copper-cable-dac-aec"],
      ["002130.SZ", "copper-cable-dac-aec"],
      ["300563.SZ", "copper-cable-dac-aec"],
      ["002837.SZ", "liquid-cooling-system"],
      ["300990.SZ", "liquid-cooling-system"],
      ["603912.SH", "liquid-cooling-system"],
      ["600481.SH", "liquid-cooling-system"],
      ["002050.SZ", "liquid-cooling-system"],
    ] as const;

    for (const [ticker, subnodeId] of requiredAshareCoverages) {
      const company = companiesByTicker.get(ticker);
      expect(company, `${ticker} should be in company master data`).toBeTruthy();
      expect(company?.market).toBe("CN");
      expect(coverageKeys.has(`${subnodeId}\u0000${company?.id}`)).toBe(true);
    }
  });

  it("expands investable A-share coverage across materials, PCB, and equipment gaps", async () => {
    const snapshot = await fixtureAtlasRepository.getSnapshot();
    const companiesByTicker = new Map(
      snapshot.companies.map((company) => [company.ticker, company]),
    );
    const coverageKeys = new Set(
      snapshot.subnodeCompanyCoverages.map(
        (coverage) => `${coverage.subnodeId}\u0000${coverage.companyId}`,
      ),
    );
    const requiredAshareCoverages = [
      ["300236.SZ", "photoresist"],
      ["300236.SZ", "wet-electronic-chemicals"],
      ["300398.SZ", "photoresist"],
      ["002436.SZ", "abf"],
      ["002436.SZ", "package-substrate"],
      ["002815.SZ", "high-layer-pcb-node"],
      ["002938.SZ", "high-layer-pcb-node"],
      ["603283.SH", "package-inspection"],
      ["603283.SH", "hbm-test"],
      ["603203.SH", "underfill-equipment"],
      ["688025.SH", "optical-coupling"],
      ["301369.SZ", "tester"],
    ] as const;

    for (const [ticker, subnodeId] of requiredAshareCoverages) {
      const company = companiesByTicker.get(ticker);
      expect(company, `${ticker} should be in company master data`).toBeTruthy();
      expect(company?.market).toBe("CN");
      expect(coverageKeys.has(`${subnodeId}\u0000${company?.id}`)).toBe(true);
    }
  });

  it("tracks company-level supply relationships beyond HBM and CPO", async () => {
    const snapshot = await fixtureAtlasRepository.getSnapshot();

    expect(snapshot.supplyRelations.length).toBeGreaterThanOrEqual(8);
    expect(snapshot.supplyRelations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          supplierId: "tsmc",
          customerId: "nvidia",
          nodeId: "hbm",
        }),
        expect.objectContaining({
          supplierId: "nvidia",
          customerId: "dell",
          nodeId: "ai-server",
        }),
        expect.objectContaining({
          supplierId: "nvidia",
          customerId: "supermicro",
          nodeId: "ai-server",
        }),
        expect.objectContaining({
          supplierId: "vertiv",
          customerId: "nvidia",
          nodeId: "ai-cluster",
        }),
        expect.objectContaining({
          supplierId: "broadcom",
          customerId: "arista",
          nodeId: "ethernet-switch",
        }),
      ]),
    );
  });

  it("rejects duplicate IDs at the repository runtime boundary", async () => {
    const snapshot = await fixtureAtlasRepository.getSnapshot();
    const result = atlasSnapshotSchema.safeParse({
      ...snapshot,
      nodes: [...snapshot.nodes, snapshot.nodes[0]],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["nodes", snapshot.nodes.length, "id"],
          }),
        ]),
      );
    }
  });

  it("rejects dangling role evidence at the repository runtime boundary", async () => {
    const snapshot = await fixtureAtlasRepository.getSnapshot();
    const result = atlasSnapshotSchema.safeParse({
      ...snapshot,
      companyNodeRoles: [
        {
          ...snapshot.companyNodeRoles[0],
          sourceIds: ["missing-source"],
        },
        ...snapshot.companyNodeRoles.slice(1),
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["companyNodeRoles", 0, "sourceIds", 0],
          }),
        ]),
      );
    }
  });
});

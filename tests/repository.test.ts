import { describe, expect, it } from "vitest";

import { fixtureAtlasRepository } from "@/lib/atlas/repository";
import { atlasSnapshotSchema } from "@/lib/atlas/schema";

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
      ["inp-material", "optical-chip"],
      ["optical-chip", "optical-engine"],
      ["optical-engine", "cpo"],
      ["cpo", "ethernet-switch"],
      ["ethernet-switch", "ai-cluster"],
      ["low-loss-ccl", "high-layer-pcb"],
      ["high-layer-pcb", "cpo"],
      ["switch-asic", "cpo"],
      ["cpo", "ai-server"],
      ["ai-server", "ai-cluster"],
      ["hbm", "ai-server"],
    ] as const;

    for (const [from, to] of requiredEdges) {
      expect(snapshot.industryEdges).toEqual(
        expect.arrayContaining([expect.objectContaining({ from, to })]),
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
});

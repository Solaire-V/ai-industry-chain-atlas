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

    expect(snapshot.industryEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "optical-chip", to: "optical-engine" }),
        expect.objectContaining({ from: "optical-engine", to: "cpo" }),
      ]),
    );

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
  });
});

import { describe, expect, it } from "vitest";

import {
  atlasStageById,
  atlasStages,
  defaultStageId,
  findStageBySearch,
  getStageIdForNode,
  getStageRealNodeIds,
  mainChainConnections,
} from "@/lib/atlas/stage-map";

describe("stage-map", () => {
  it("defines the approved 9-stage AI industry chain", () => {
    expect(atlasStages.map(({ id }) => id)).toEqual([
      "materials",
      "equipment",
      "ai-chip",
      "hbm-memory",
      "advanced-packaging",
      "board-system",
      "optical-interconnect",
      "server-network",
      "compute-applications",
    ]);
    expect(defaultStageId).toBe("optical-interconnect");
    expect(atlasStages.map(({ name }) => name)).toEqual([
      "材料",
      "设备",
      "AI 芯片",
      "HBM 存储",
      "先进封装",
      "板级系统",
      "光互联",
      "服务器网络",
      "算力应用",
    ]);
  });

  it("keeps materials and equipment as stages and as cross-stage inputs", () => {
    const optical = atlasStageById.get("optical-interconnect");
    expect(optical?.diagram.inputs.map(({ label }) => label)).toEqual(
      expect.arrayContaining(["InP / SOI", "光纤 / 透镜", "光耦合 / 高速测试设备"]),
    );
    expect(optical?.diagram.outputs.map(({ label }) => label)).toEqual(
      expect.arrayContaining(["CPO", "可插拔光模块", "交换机 / AI 集群"]),
    );
    expect(
      mainChainConnections.filter(({ from }) => from === "materials").map(({ to }) => to),
    ).toEqual(
      expect.arrayContaining([
        "ai-chip",
        "hbm-memory",
        "advanced-packaging",
        "board-system",
        "optical-interconnect",
      ]),
    );
    expect(
      mainChainConnections.filter(({ from }) => from === "equipment").map(({ kind, to }) => `${kind}:${to}`),
    ).toEqual(
      expect.arrayContaining([
        "enable:ai-chip",
        "enable:hbm-memory",
        "enable:advanced-packaging",
        "enable:board-system",
        "enable:optical-interconnect",
      ]),
    );
  });

  it("splits semiconductor materials to minimum subnodes without making them all real nodes", () => {
    const materials = atlasStageById.get("materials");
    const labels = materials?.groups.flatMap((group) =>
      group.nodes.map((node) => node.label),
    );

    expect(labels).toEqual(
      expect.arrayContaining([
        "硅片",
        "SOI",
        "InP",
        "光刻胶",
        "电子气体",
        "CMP 抛光液",
        "CMP 抛光垫",
        "靶材",
        "ABF",
        "铜箔",
        "玻纤布",
        "液冷液",
      ]),
    );
  });

  it("maps real atlas nodes to their stage", () => {
    expect(getStageIdForNode("cpo")).toBe("optical-interconnect");
    expect(getStageIdForNode("optical-engine")).toBe("optical-interconnect");
    expect(getStageIdForNode("hbm")).toBe("hbm-memory");
    expect(getStageIdForNode("high-layer-pcb")).toBe("board-system");
    expect(getStageIdForNode("missing-node")).toBeNull();

    const optical = atlasStageById.get("optical-interconnect");
    expect(optical ? [...getStageRealNodeIds(optical)] : []).toEqual(
      expect.arrayContaining(["optical-chip", "laser", "optical-engine", "cpo"]),
    );
  });

  it("searches stage names, group names, subnode labels, and real node ids", () => {
    expect(findStageBySearch("光刻胶")?.id).toBe("materials");
    expect(findStageBySearch("高速测试")?.id).toBe("equipment");
    expect(findStageBySearch("CPO")?.id).toBe("optical-interconnect");
    expect(findStageBySearch("AIDC")?.id).toBe("compute-applications");
    expect(findStageBySearch("not found")).toBeNull();
  });
});

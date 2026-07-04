import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AtlasApp, type AtlasHistoryAdapter } from "@/components/atlas/atlas-app";
import { verticalSlice } from "@/content/seed/vertical-slice";
import type { AtlasSnapshot } from "@/lib/atlas/schema";
import { atlasSnapshotSchema } from "@/lib/atlas/schema";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
});

const renderAtlas = (
  query = new URLSearchParams("layer=interconnect&mode=supply"),
  snapshot: AtlasSnapshot = verticalSlice,
) => {
  const replace = vi.fn();
  const push = vi.fn();
  const historyAdapter: AtlasHistoryAdapter = { push, replace };
  render(
    <AtlasApp
      initialSnapshot={snapshot}
      initialQuery={query}
      historyAdapter={historyAdapter}
    />,
  );
  return { push, replace };
};

const openGlobalSearch = () => {
  fireEvent.click(screen.getByRole("button", { name: /全局搜索/ }));
  return screen.getByRole("searchbox", { name: "全局搜索" });
};

describe("AtlasApp", () => {
  it("renders the swimlane workbench with product navigation and no legacy controls", () => {
    renderAtlas();

    expect(
      screen.queryByRole("navigation", { name: "产业层级" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "关系模式" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "AI 产业链三层地图" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "AI 产业链目录" }),
    ).toBeInTheDocument();
    for (const name of ["主界面", "节点库", "公司库", "行情数据", "供需关系", "数据设置"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass("swimlane-canvas-card");

    for (const name of [
      "材料",
      "设备",
      "AI 芯片",
      "HBM 存储",
      "先进封装",
      "板级系统",
      "光互联",
      "服务器网络",
      "算力应用",
    ]) {
      expect(
        within(canvas).getByRole("button", { name: new RegExp(name) }),
      ).toBeInTheDocument();
    }

    expect(screen.getByRole("heading", { name: "AI 产业链泳道图" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "光互联流程详情" })).toBeInTheDocument();
    expect(screen.queryByText("可更新数据层")).not.toBeInTheDocument();
  });

  it("uses an explicit global search launcher with destination results", () => {
    const { push } = renderAtlas();

    expect(
      screen.queryByRole("searchbox", { name: "搜索节点、公司或代码" }),
    ).not.toBeInTheDocument();

    const globalSearch = openGlobalSearch();
    expect(globalSearch).toHaveAttribute("placeholder", "搜公司 / 节点 / 产业环节");
    expect(screen.getByText("选择结果后跳转到对应页面")).toBeInTheDocument();

    fireEvent.change(globalSearch, { target: { value: "源杰科技" } });
    fireEvent.click(screen.getByRole("button", { name: /公司详情.*源杰科技/ }));

    expect(push).toHaveBeenLastCalledWith(
      expect.stringContaining("view=companies"),
    );
    expect(push).toHaveBeenLastCalledWith(
      expect.stringContaining("company=yuanjie-technology"),
    );
    expect(screen.getByRole("dialog", { name: "源杰科技" })).toBeInTheDocument();
  });

  it("keeps main canvas connections aligned with the inspector chain summary", () => {
    renderAtlas();
    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });

    for (const label of [
      "材料 → 板级系统",
      "设备 ⇢ HBM",
      "设备 ⇢ 板级系统",
      "服务器网络 → 算力应用",
    ]) {
      expect(canvas.querySelector(`path[aria-label="${label}"]`)).toBeInTheDocument();
    }

    fireEvent.click(within(canvas).getByRole("button", { name: /板级系统/ }));
    const boardInspector = screen.getByRole("complementary", {
      name: "板级系统流程详情",
    });
    expect(within(boardInspector).getByRole("heading", { name: "连接总览" })).toBeInTheDocument();
    expect(within(boardInspector).getByText("材料 → 板级系统")).toBeInTheDocument();
    expect(within(boardInspector).getByText("设备 ⇢ 板级系统")).toBeInTheDocument();
    expect(within(boardInspector).getByText("先进封装 → 板级系统")).toBeInTheDocument();
    expect(within(boardInspector).getByText("板级系统 → 服务器网络")).toBeInTheDocument();

    fireEvent.click(within(canvas).getByRole("button", { name: /HBM 存储/ }));
    const hbmInspector = screen.getByRole("complementary", {
      name: "HBM 存储流程详情",
    });
    expect(within(hbmInspector).getByText("材料 → HBM")).toBeInTheDocument();
    expect(within(hbmInspector).getByText("设备 ⇢ HBM")).toBeInTheDocument();
    expect(within(hbmInspector).getByText("HBM → 先进封装")).toBeInTheDocument();

    fireEvent.click(within(canvas).getByRole("button", { name: /AI 芯片/ }));
    const chipInspector = screen.getByRole("complementary", {
      name: "AI 芯片流程详情",
    });
    expect(within(chipInspector).getByText("软件 / IP 工具链 ⇢ AI 芯片")).toBeInTheDocument();

    fireEvent.click(within(canvas).getByRole("button", { name: /服务器网络/ }));
    const serverInspector = screen.getByRole("complementary", {
      name: "服务器网络流程详情",
    });
    expect(
      within(serverInspector).getByText("软件 / IP 工具链 ⇢ 服务器网络"),
    ).toBeInTheDocument();
  });

  it("keeps HBM as an upstream input rather than an advanced packaging drill-down node", () => {
    renderAtlas(new URLSearchParams("layer=interconnect&mode=supply&stage=advanced-packaging"));

    const packagingInspector = screen.getByRole("complementary", {
      name: "先进封装流程详情",
    });

    expect(within(packagingInspector).getByText("HBM → 先进封装")).toBeInTheDocument();
    expect(within(packagingInspector).getByText("HBM")).toBeInTheDocument();
    expect(within(packagingInspector).queryByTestId("node-hbm")).not.toBeInTheDocument();
  });

  it("keeps material minimum subnodes in the node library instead of the main canvas", () => {
    renderAtlas();
    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });

    fireEvent.click(within(canvas).getByRole("button", { name: /材料/ }));

    expect(screen.getByRole("complementary", { name: "材料流程详情" })).toBeInTheDocument();
    expect(screen.queryByText("光刻胶")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /节点库/ }));
    expect(screen.getByRole("heading", { name: "节点库" })).toBeInTheDocument();
    expect(screen.getAllByText("硅片").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SOI").length).toBeGreaterThan(0);
    expect(screen.getByText("InP")).toBeInTheDocument();
    expect(screen.getByText("光刻胶")).toBeInTheDocument();
    expect(screen.getByText("电子气体")).toBeInTheDocument();
    expect(screen.getByText("CMP 抛光液")).toBeInTheDocument();
    expect(screen.getByText("ABF")).toBeInTheDocument();
    expect(screen.getByText("铜箔")).toBeInTheDocument();
    expect(screen.getByText("液冷液")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /行情数据/ }));
    expect(screen.getByRole("heading", { name: "行情数据" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /供需关系/ }));
    expect(screen.getByRole("heading", { name: "供需关系" })).toBeInTheDocument();
  });

  it("keeps node library stages aligned with the main canvas", () => {
    renderAtlas(new URLSearchParams("layer=interconnect&mode=supply&stage=materials"));

    fireEvent.click(screen.getByRole("button", { name: /节点库/ }));
    expect(screen.getByRole("heading", { name: "节点库" })).toBeInTheDocument();

    const stageNav = screen.getByLabelText("节点库阶段导航");
    fireEvent.click(within(stageNav).getByRole("button", { name: /05.*先进封装/ }));

    expect(screen.getByRole("main", { name: "先进封装节点清单" })).toBeInTheDocument();
    expect(screen.getByText("Silicon Interposer")).toBeInTheDocument();
    expect(screen.getByText("CoWoS")).toBeInTheDocument();
    expect(screen.getByText("封装基板")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "产业链泳道画布" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "定位主界面模块" }));
    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });
    expect(within(canvas).getByRole("button", { name: /先进封装/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("opens the node library from the view query and writes directory navigation to the URL", () => {
    const { push } = renderAtlas(
      new URLSearchParams("view=nodes&layer=interconnect&mode=supply&stage=equipment"),
    );

    expect(screen.getByRole("heading", { name: "节点库" })).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "设备节点清单" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "产业链泳道画布" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /行情数据/ }));

    expect(screen.getByRole("heading", { name: "行情数据" })).toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith(
      "?view=markets&layer=interconnect&mode=supply&stage=equipment",
    );
  });

  it("disambiguates equipment high-speed testing nodes in the node library", () => {
    renderAtlas(
      new URLSearchParams("view=nodes&layer=interconnect&mode=supply&stage=equipment"),
    );

    const equipmentBrowser = screen.getByRole("main", { name: "设备节点清单" });
    const highSpeedTestingCards = within(equipmentBrowser)
      .getAllByRole("button")
      .filter((button) => button.textContent?.includes("高速测试"))
      .map((button) => button.textContent?.replace(/\s+/g, ""));

    expect(highSpeedTestingCards).toEqual([
      "设备芯片/器件高速测试6公司爱德万测试泰瑞达是德科技长川科技+2",
      "设备光模块/CPO高速测试4公司是德科技致茂电子泰瑞达博杰股份",
    ]);
  });

  it("shows compact company previews in node cards without misleading single-company badges", () => {
    renderAtlas(
      new URLSearchParams("view=nodes&layer=interconnect&mode=supply&stage=materials"),
    );

    const siliconCard = screen.getByTestId("library-node-silicon-wafer");
    expect(within(siliconCard).getByText("3 公司")).toBeInTheDocument();
    expect(within(siliconCard).getByText("沪硅产业")).toBeInTheDocument();
    expect(within(siliconCard).getByText("TCL 中环")).toBeInTheDocument();
    expect(within(siliconCard).getByText("立昂微")).toBeInTheDocument();
    expect(within(siliconCard).queryByText("3 家覆盖")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /板级系统/ }));
    const pcbCard = screen.getByTestId("library-node-high-layer-pcb-node");
    expect(within(pcbCard).getByText("9 公司")).toBeInTheDocument();
    expect(within(pcbCard).getByText("胜宏科技")).toBeInTheDocument();
    expect(within(pcbCard).getByText("沪电股份")).toBeInTheDocument();
    expect(within(pcbCard).getByText("深南电路")).toBeInTheDocument();
    expect(within(pcbCard).getByText("东山精密")).toBeInTheDocument();
    expect(within(pcbCard).getByText("+5")).toBeInTheDocument();
    expect(within(pcbCard).queryByText("9 家覆盖")).not.toBeInTheDocument();
  });

  it("shows expanded AIDC power, copper interconnect, and cooling nodes in the node library", () => {
    renderAtlas(
      new URLSearchParams("view=nodes&layer=interconnect&mode=supply&stage=board-system"),
    );

    const copperCard = screen.getByTestId("library-node-copper-cable-dac-aec");
    expect(within(copperCard).getByText("6 公司")).toBeInTheDocument();
    expect(within(copperCard).getByText("立讯精密")).toBeInTheDocument();
    expect(within(copperCard).getByText("兆龙互连")).toBeInTheDocument();
    expect(within(copperCard).getByText("沃尔核材")).toBeInTheDocument();
    expect(within(copperCard).getByText("神宇股份")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /服务器网络/ }));

    expect(screen.getByTestId("library-node-ups-power-distribution")).toBeInTheDocument();
    expect(screen.getByTestId("library-node-transformer-switchgear")).toBeInTheDocument();
    expect(screen.getByTestId("library-node-energy-storage-grid")).toBeInTheDocument();
    const coolingCard = screen.getByTestId("library-node-liquid-cooling-system");
    expect(within(coolingCard).getByText("10 公司")).toBeInTheDocument();
    expect(within(coolingCard).getByText("英维克")).toBeInTheDocument();
    expect(within(coolingCard).getByText("高澜股份")).toBeInTheDocument();
    expect(within(coolingCard).getByText("申菱环境")).toBeInTheDocument();
    expect(within(coolingCard).getByText("科创新源")).toBeInTheDocument();
    expect(within(coolingCard).getByText("+6")).toBeInTheDocument();
  });

  it("marks reused real nodes with their cross-stage positions", () => {
    renderAtlas(
      new URLSearchParams("view=nodes&layer=interconnect&mode=supply&stage=materials"),
    );

    const lowLossCclCard = screen.getByTestId("library-node-low-loss-ccl");
    expect(within(lowLossCclCard).getByText("跨阶段")).toBeInTheDocument();

    fireEvent.click(lowLossCclCard);

    const detail = screen.getByRole("complementary", { name: "节点详情" });
    expect(within(detail).getByRole("heading", { name: "跨阶段复用" })).toBeInTheDocument();
    expect(within(detail).getByText("材料 / PCB 材料")).toBeInTheDocument();
    expect(within(detail).getByText("板级系统 / 高速板级互联")).toBeInTheDocument();
  });

  it("keeps node-library chrome focused on investment research instead of engineering stats", () => {
    renderAtlas(
      new URLSearchParams("view=nodes&layer=interconnect&mode=supply&stage=equipment"),
    );

    const stageNav = screen.getByLabelText("节点库阶段导航");
    expect(within(stageNav).getByRole("button", { name: /02.*设备.*28 节点/ })).toBeInTheDocument();
    expect(within(stageNav).queryByText(/已覆盖/)).not.toBeInTheDocument();
    expect(screen.queryByText("主链模块")).not.toBeInTheDocument();
    expect(screen.queryByText("二级分类")).not.toBeInTheDocument();
    expect(screen.queryByText("细分节点")).not.toBeInTheDocument();
    expect(screen.queryByText("已覆盖节点")).not.toBeInTheDocument();
    expect(screen.queryByText("公司映射")).not.toBeInTheDocument();
  });

  it("shows subnode company coverage in the node library", () => {
    const withCoverage = atlasSnapshotSchema.parse({
      ...verticalSlice,
      subnodeCompanyCoverages: [
        {
          id: "optical-interconnect-laser-node-coherent",
          stageId: "optical-interconnect",
          groupId: "optoelectronic-devices",
          subnodeId: "laser-node",
          companyId: "coherent",
          rank: 1,
          priority: "leader",
          relevance: "direct",
          evidenceLevel: "A",
          role: "数据中心高速激光器代表公司",
          marketShareNote: "测试节点库展示市占、客户地位或产品地位说明。",
          marketCapNote: "测试节点库展示上市市场和投资可跟踪性说明。",
          sourceIds: ["coherent-cpo-2026"],
        },
      ],
    });
    renderAtlas(
      new URLSearchParams("view=nodes&layer=interconnect&mode=supply&stage=optical-interconnect"),
      withCoverage,
    );

    const laserCard = screen.getByTestId("library-node-laser-node");
    expect(within(laserCard).getByText("1 公司")).toBeInTheDocument();

    fireEvent.click(laserCard);

    const detail = screen.getByRole("complementary", { name: "节点详情" });
    const coverageSection = within(detail)
      .getByRole("heading", { name: "代表公司" })
      .closest("section");
    expect(coverageSection).not.toBeNull();
    expect(within(coverageSection!).getByRole("button", { name: "全部 1" })).toBeInTheDocument();
    expect(within(coverageSection!).getByRole("button", { name: "其他 1" })).toBeInTheDocument();
    expect(within(coverageSection!).getByText("Coherent")).toBeInTheDocument();
    expect(within(coverageSection!).getByText("COHR · NYSE")).toBeInTheDocument();
    expect(within(coverageSection!).getByText("美股")).toBeInTheDocument();
    expect(within(coverageSection!).getByText("数据中心高速激光器代表公司")).toBeInTheDocument();
    expect(within(coverageSection!).queryByText("A 级证据")).not.toBeInTheDocument();
    expect(
      within(coverageSection!).queryByText("测试节点库展示市占、客户地位或产品地位说明。"),
    ).not.toBeInTheDocument();
    expect(
      within(coverageSection!).queryByText("测试节点库展示上市市场和投资可跟踪性说明。"),
    ).not.toBeInTheDocument();
  });

  it("filters subnode coverage companies with compact market chips", () => {
    renderAtlas(
      new URLSearchParams("view=nodes&layer=interconnect&mode=supply&stage=optical-interconnect"),
    );

    fireEvent.click(screen.getByTestId("library-node-laser-node"));

    const detail = screen.getByRole("complementary", { name: "节点详情" });
    const coverageSection = within(detail)
      .getByRole("heading", { name: "代表公司" })
      .closest("section");
    expect(coverageSection).not.toBeNull();

    expect(within(coverageSection!).getByRole("button", { name: "全部 5" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(coverageSection!).getByRole("button", { name: "A股 3" })).toBeInTheDocument();
    expect(within(coverageSection!).getByRole("button", { name: "其他 2" })).toBeInTheDocument();

    const defaultRows = within(coverageSection!).getAllByTestId("node-library-company-row");
    expect(defaultRows[0]).toHaveTextContent("源杰科技");
    expect(defaultRows[0]).toHaveTextContent("A股");
    expect(within(coverageSection!).getByText("源杰科技")).toBeInTheDocument();
    expect(within(coverageSection!).getByText("688498.SH · SSE STAR")).toBeInTheDocument();
    expect(within(coverageSection!).getByText("Coherent")).toBeInTheDocument();

    fireEvent.click(within(coverageSection!).getByRole("button", { name: "A股 3" }));
    expect(within(coverageSection!).getByText("源杰科技")).toBeInTheDocument();
    expect(within(coverageSection!).queryByText("Coherent")).not.toBeInTheDocument();

    fireEvent.click(within(coverageSection!).getByRole("button", { name: "其他 2" }));
    expect(within(coverageSection!).getByText("Coherent")).toBeInTheDocument();
    expect(within(coverageSection!).queryByText("源杰科技")).not.toBeInTheDocument();
  });

  it("states market and supply data completeness on their own pages", () => {
    renderAtlas(new URLSearchParams("view=markets&layer=interconnect&mode=supply"));

    expect(screen.getByRole("heading", { name: "行情数据" })).toBeInTheDocument();
    expect(screen.getByText("行情未接入")).toBeInTheDocument();
    expect(screen.getByText(`0 / ${verticalSlice.companies.length} 公司有行情`)).toBeInTheDocument();
    const marketTable = screen.getByRole("table", { name: "行情公司表" });
    expect(within(marketTable).getByText("中际旭创")).toBeInTheDocument();
    expect(within(marketTable).getByText("股价")).toBeInTheDocument();
    expect(within(marketTable).getByText("市值")).toBeInTheDocument();
    expect(screen.queryByText("实时股价")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /供需关系/ }));

    expect(screen.getByRole("heading", { name: "供需关系" })).toBeInTheDocument();
    const supplyStatus = screen.getByLabelText("供需数据状态");
    expect(within(supplyStatus).getByText("链路")).toBeInTheDocument();
    expect(within(supplyStatus).getByText("21 条")).toBeInTheDocument();
    expect(within(supplyStatus).getByText("公司关系")).toBeInTheDocument();
    expect(
      within(supplyStatus).getByText(`${verticalSlice.supplyRelations.length} 条`),
    ).toBeInTheDocument();
    const supplyTable = screen.getByRole("table", { name: "公司供需表" });
    expect(within(supplyTable).getByText("SK 海力士")).toBeInTheDocument();
    expect(within(supplyTable).getAllByText("英伟达").length).toBeGreaterThanOrEqual(2);
    expect(within(supplyTable).getByText(/HBM3E/)).toBeInTheDocument();
    expect(within(supplyTable).getByText(/Micron HBM4/)).toBeInTheDocument();
    expect(within(supplyTable).getByText(/COUPE 光子引擎/)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "产业链边表" })).toBeInTheDocument();
    expect(screen.queryByText("供应关系数据待补全")).not.toBeInTheDocument();
  });

  it("renders supply relations as a data-first investor workbench", () => {
    renderAtlas(new URLSearchParams("view=supply&layer=interconnect&mode=supply"));

    const workbench = screen.getByLabelText("供需投研区");
    const supplyTable = within(workbench).getByRole("table", { name: "公司供需表" });
    expect(within(supplyTable).getByText("SK 海力士")).toBeInTheDocument();
    expect(within(supplyTable).getAllByText("英伟达").length).toBeGreaterThanOrEqual(2);
    expect(within(supplyTable).getByText("美光科技")).toBeInTheDocument();
    expect(within(supplyTable).getAllByText("台积电").length).toBeGreaterThanOrEqual(2);
    expect(within(supplyTable).getAllByText("博通").length).toBeGreaterThanOrEqual(2);

    expect(screen.getByRole("heading", { name: "节点链路" })).toBeInTheDocument();
    const chainGroups = within(workbench).getByLabelText("节点链路分组");
    expect(within(chainGroups).getByText("供应链路")).toBeInTheDocument();
    expect(within(chainGroups).getByText("集成链路")).toBeInTheDocument();
    expect(within(chainGroups).getByText("落地链路")).toBeInTheDocument();
    expect(within(chainGroups).getByText("InP 衬底 → 光芯片")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "关系覆盖" })).not.toBeInTheDocument();
    expect(screen.queryByText("先看哪些节点已经有公司级证据，哪些节点目前只有产业链逻辑连接。")).not.toBeInTheDocument();
  });

  it("displays local valuation metrics on the market page when snapshots include them", () => {
    const snapshotWithMarket = atlasSnapshotSchema.parse({
      ...verticalSlice,
      marketSnapshots: [
        {
          companyId: "nvidia",
          price: 120,
          changePct: 2.5,
          currency: "USD",
          tradedAt: "2026-07-03T20:00:00.000Z",
          fetchedAt: "2026-07-03T20:15:00.000Z",
          delayMinutes: 15,
          ttmEps: 4,
          ttmPe: 30,
          freshnessSource: "delayed",
          marketCap: 3_000_000_000_000,
          pb: 40,
          ps: 25,
          turnover: 10_000_000_000,
        },
      ],
    });
    renderAtlas(
      new URLSearchParams("view=markets&layer=interconnect&mode=supply"),
      snapshotWithMarket,
    );

    const marketTable = screen.getByRole("table", { name: "行情公司表" });
    expect(within(marketTable).getByText("英伟达")).toBeInTheDocument();
    expect(within(marketTable).getByText("USD 120")).toBeInTheDocument();
    expect(within(marketTable).getByText("30")).toBeInTheDocument();
    expect(within(marketTable).getByText("40 / 25")).toBeInTheDocument();
    expect(within(marketTable).getAllByText(/USD/).length).toBeGreaterThan(1);
  });

  it("renders market data as an investor dashboard grouped by industry stage", () => {
    const snapshotWithMarket = atlasSnapshotSchema.parse({
      ...verticalSlice,
      marketSnapshots: [
        {
          companyId: "zhongji-innolight",
          price: 188,
          changePct: 10,
          currency: "CNY",
          tradedAt: "2026-07-03T07:00:00.000Z",
          fetchedAt: "2026-07-03T07:15:00.000Z",
          delayMinutes: 15,
          ttmEps: 3,
          ttmPe: 62,
          freshnessSource: "delayed",
          marketCap: 210_000_000_000,
          pb: 9,
          ps: 18,
          turnover: 12_000_000_000,
        },
        {
          companyId: "eoptolink",
          price: 155,
          changePct: 2,
          currency: "CNY",
          tradedAt: "2026-07-03T07:00:00.000Z",
          fetchedAt: "2026-07-03T07:15:00.000Z",
          delayMinutes: 15,
          ttmEps: 2,
          ttmPe: 50,
          freshnessSource: "delayed",
          marketCap: 120_000_000_000,
          pb: 8,
          ps: 15,
          turnover: 7_000_000_000,
        },
        {
          companyId: "nvidia",
          price: 120,
          changePct: -1,
          currency: "USD",
          tradedAt: "2026-07-03T20:00:00.000Z",
          fetchedAt: "2026-07-03T20:15:00.000Z",
          delayMinutes: 15,
          ttmEps: 4,
          ttmPe: 30,
          freshnessSource: "delayed",
          marketCap: 3_000_000_000_000,
          pb: 40,
          ps: 25,
          turnover: 10_000_000_000,
        },
      ],
    });

    renderAtlas(
      new URLSearchParams("view=markets&layer=interconnect&mode=supply"),
      snapshotWithMarket,
    );

    const workbench = screen.getByLabelText("行情投研区");
    expect(screen.getByRole("heading", { name: "板块趋势" })).toBeInTheDocument();
    const sectorTable = within(workbench).getByRole("table", { name: "板块趋势表" });
    const opticalRow = within(sectorTable).getByText("光互联").closest("tr");
    expect(opticalRow).not.toBeNull();
    expect(within(opticalRow!).getByText(/^3 \/ \d+$/)).toBeInTheDocument();
    expect(within(opticalRow!).getByText("+3.67%")).toBeInTheDocument();
    expect(within(opticalRow!).getByText("中际旭创")).toBeInTheDocument();
    expect(within(opticalRow!).getByText("英伟达")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "个股异动" })).toBeInTheDocument();
    const moversTable = within(workbench).getByRole("table", { name: "个股行情榜" });
    const moverRows = within(moversTable).getAllByRole("row");
    expect(moverRows[1]).toHaveTextContent("中际旭创");
    expect(moverRows[1]).toHaveTextContent("+10%");
    expect(screen.queryByText("按节点库公司覆盖聚合，同一公司在同一环节只计一次。")).not.toBeInTheDocument();
    expect(screen.queryByText("按最新涨跌幅排序，后续接入历史快照后扩展为多日趋势。")).not.toBeInTheDocument();
  });

  it("renders data settings with a protected market refresh console", () => {
    renderAtlas(new URLSearchParams("view=settings&layer=interconnect&mode=supply"));

    expect(screen.getByRole("heading", { name: "数据设置" })).toBeInTheDocument();
    expect(screen.getByText("本地展示数据")).toBeInTheDocument();
    expect(screen.getByText("Supabase 可切换")).toBeInTheDocument();
    expect(screen.getAllByText("行情未接入").length).toBeGreaterThan(0);
    expect(screen.getByText("/api/atlas/status")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "行情刷新" })).toBeInTheDocument();
    expect(screen.getByLabelText("刷新密钥")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "检查配置" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "刷新写库" })).toBeDisabled();
    expect(screen.queryByText("上线前阻塞项")).not.toBeInTheDocument();
    expect(screen.queryByText("待配置")).not.toBeInTheDocument();
  });

  it("triggers dry-run and live market refresh from data settings without exposing the secret", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const dryRun = url.includes("dryRun=1");
      return new Response(
        JSON.stringify({
          status: dryRun ? "dry_run" : "succeeded",
          code: dryRun ? "dry_run" : "market_update_succeeded",
          provider: "hithink-fuyao",
          trigger: "manual",
          companyCount: verticalSlice.companies.length,
          rowsRead: dryRun ? undefined : 130,
          rowsWritten: dryRun ? undefined : 130,
          wouldWrite: !dryRun,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAtlas(new URLSearchParams("view=settings&layer=interconnect&mode=supply"));

    fireEvent.change(screen.getByLabelText("刷新密钥"), {
      target: { value: "manual-refresh-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "检查配置" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/atlas/admin/refresh-market?dryRun=1",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer manual-refresh-secret",
          }),
        }),
      );
    });
    expect(screen.getByText("dry_run")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新写库" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/atlas/admin/refresh-market",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer manual-refresh-secret",
          }),
        }),
      );
    });
    expect(screen.getByText("130 / 130")).toBeInTheDocument();
    expect(screen.getByText("hithink-fuyao")).toBeInTheDocument();
    expect(screen.queryByText("manual-refresh-secret")).not.toBeInTheDocument();
  });

  it("renders the company library as an investment screener", () => {
    renderAtlas(new URLSearchParams("view=companies&layer=interconnect&mode=supply"));

    expect(screen.getByRole("heading", { name: "公司库" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "搜索公司" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "公司研究表" })).toBeInTheDocument();
    const freshness = screen.getByLabelText("行情数据状态");
    expect(within(freshness).getByText("行情未接入")).toBeInTheDocument();
    expect(
      within(freshness).getByText(`0 / ${verticalSlice.companies.length} 公司有行情`),
    ).toBeInTheDocument();
    const detail = screen.getByRole("complementary", { name: "公司详情" });
    expect(detail).toBeInTheDocument();
    expect(within(detail).getByRole("heading", { name: "产业链位置" })).toBeInTheDocument();
    expect(within(detail).getByRole("heading", { name: "行情估值" })).toBeInTheDocument();
    expect(within(detail).getByRole("heading", { name: "供需关系" })).toBeInTheDocument();

    expect(screen.queryByText("公司数据完整度")).not.toBeInTheDocument();
    expect(screen.queryByText(/节点挂载/)).not.toBeInTheDocument();
    expect(screen.queryByText(/公司基本资料独立维护/)).not.toBeInTheDocument();
  });

  it("filters company library rows by search, market, and stage", () => {
    renderAtlas(new URLSearchParams("view=companies&layer=interconnect&mode=supply"));

    const table = screen.getByRole("table", { name: "公司研究表" });
    const search = screen.getByRole("searchbox", { name: "搜索公司" });
    fireEvent.change(search, { target: { value: "688498" } });

    expect(within(table).getByText("源杰科技")).toBeInTheDocument();
    expect(within(table).queryByText("Coherent")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "" } });
    const marketFilters = screen.getByRole("group", { name: "市场" });
    fireEvent.click(within(marketFilters).getByRole("button", { name: /其他/ }));

    expect(within(table).getByText("Coherent")).toBeInTheDocument();
    expect(within(table).queryByText("源杰科技")).not.toBeInTheDocument();

    fireEvent.click(within(marketFilters).getByRole("button", { name: /全部/ }));
    fireEvent.change(screen.getByLabelText("产业环节"), {
      target: { value: "materials" },
    });

    expect(within(table).getByText("沪硅产业")).toBeInTheDocument();
    expect(within(table).queryByText("工业富联")).not.toBeInTheDocument();
  });

  it("updates the company detail panel from the selected company row", () => {
    renderAtlas(new URLSearchParams("view=companies&layer=interconnect&mode=supply"));

    const table = screen.getByRole("table", { name: "公司研究表" });
    fireEvent.change(screen.getByRole("searchbox", { name: "搜索公司" }), {
      target: { value: "源杰科技" },
    });
    fireEvent.click(within(table).getByRole("button", { name: /源杰科技/ }));

    const detail = screen.getByRole("complementary", { name: "公司详情" });
    expect(within(detail).getByRole("heading", { name: "源杰科技" })).toBeInTheDocument();
    expect(within(detail).getByText("688498.SH · SSE STAR")).toBeInTheDocument();
    expect(within(detail).getAllByText("光互联").length).toBeGreaterThan(0);
    expect(within(detail).getByText(/高速激光器/)).toBeInTheDocument();
    expect(within(detail).getByText("股价")).toBeInTheDocument();
    expect(within(detail).getByText("市值")).toBeInTheDocument();
    expect(within(detail).getAllByText("—").length).toBeGreaterThan(0);
    expect(within(detail).getByText("客户 0")).toBeInTheDocument();
    expect(within(detail).getByText("供应商 0")).toBeInTheDocument();
  });

  it("selects a company when clicking anywhere on the company library row", () => {
    renderAtlas(new URLSearchParams("view=companies&layer=interconnect&mode=supply"));

    const table = screen.getByRole("table", { name: "公司研究表" });
    const coherentRow = within(table).getByText("Coherent").closest("tr");
    expect(coherentRow).not.toBeNull();

    fireEvent.click(coherentRow!);

    const detail = screen.getByRole("complementary", { name: "公司详情" });
    expect(within(detail).getByRole("heading", { name: "Coherent" })).toBeInTheDocument();
  });

  it("keeps investable node library details local without a duplicate detail action", () => {
    renderAtlas(new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect"));

    fireEvent.click(screen.getByRole("button", { name: /节点库/ }));
    fireEvent.click(screen.getByTestId("library-node-cpo-node"));

    expect(screen.getByRole("complementary", { name: "节点详情" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "投资节点资料" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开节点详情" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "共封装光学" })).not.toBeInTheDocument();
  });

  it("shows equipment as an upstream stage and as manufacturing enablement", () => {
    renderAtlas();
    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });

    fireEvent.click(within(canvas).getByRole("button", { name: /设备/ }));

    expect(screen.getByRole("complementary", { name: "设备流程详情" })).toBeInTheDocument();
    expect(screen.getAllByText(/前道设备/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/封装设备/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/测试设备/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PCB 设备/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/光模块设备/).length).toBeGreaterThan(0);
  });

  it("defaults to optical interconnect and shows a complete CPO internal flow", () => {
    renderAtlas();
    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });

    expect(within(canvas).getByRole("button", { name: /光互联/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("complementary", { name: "光互联流程详情" })).toBeInTheDocument();
    expect(screen.getByText("InP / SOI")).toBeInTheDocument();
    expect(screen.getByText("光耦合 / 高速测试设备")).toBeInTheDocument();
    expect(screen.getByText("光芯片")).toBeInTheDocument();
    expect(screen.getByText("激光器")).toBeInTheDocument();
    expect(screen.getAllByText(/DSP/).length).toBeGreaterThan(0);
    expect(screen.getByText("光引擎")).toBeInTheDocument();
    expect(screen.getByText("CPO")).toBeInTheDocument();
    expect(screen.getByText("交换机 / AI 集群")).toBeInTheDocument();
  });

  it("opens the CPO dialog with the sole raster illustration and code-native detail", () => {
    renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo"),
    );

    const dialog = screen.getByRole("dialog", { name: "共封装光学" });
    expect(within(dialog).getByRole("img", { name: "CPO 技术剖面示意图" })).toHaveAttribute(
      "src",
      expect.stringContaining("cpo-technical-cutaway.png"),
    );
    expect(within(dialog).getByText("AI 生成技术示意图")).toBeInTheDocument();
    expect(within(dialog).getByText("博通")).toBeInTheDocument();
    expect(within(dialog).getByText("AVGO")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Broadcom Delivers 51.2-Tbps/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "主要来源" })).toBeInTheDocument();
    expect(within(dialog).queryByText("证据支持的供需关系")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("img")).not.toHaveAttribute(
      "alt",
      expect.stringContaining("博通"),
    );
  });

  it("shows selected CPO relationships without a relationship mode toggle", () => {
    renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo"),
    );

    expect(screen.getByTestId("node-optical-engine")).toHaveAttribute(
      "data-related",
      "true",
    );
    expect(
      screen.getByText("光引擎 → 共封装光学（集成）"),
    ).toBeInTheDocument();
    expect(screen.getByText("光引擎 → CPO")).toBeInTheDocument();
    expect(screen.getByText("CPO / 光模块 → 交换机 / AI 集群")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "直接关系" })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps legacy layer and mode links compatible without showing mode controls", () => {
    renderAtlas(
      new URLSearchParams("layer=interconnect&mode=all"),
    );

    expect(
      screen.queryByRole("navigation", { name: "产业层级" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI 产业链泳道图" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /AI 芯片/ })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "关系模式" })).not.toBeInTheDocument();
  });

  it("preserves spaces while typing and replaces the canonical search URL after debounce", () => {
    vi.useFakeTimers();
    const { replace } = renderAtlas();
    const search = openGlobalSearch();

    for (const value of ["silicon", "silicon ", "silicon photonics"]) {
      fireEvent.change(search, { target: { value } });
      expect(search).toHaveValue(value);
    }
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(replace).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=optical-interconnect&q=silicon+photonics",
    );
  });

  it("searches virtual subnodes and opens their owning stage", () => {
    vi.useFakeTimers();
    const { replace } = renderAtlas();
    const search = openGlobalSearch();

    fireEvent.change(search, { target: { value: "光刻胶" } });

    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });
    expect(within(canvas).getByRole("button", { name: /材料/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("complementary", { name: "材料流程详情" })).toBeInTheDocument();
    expect(screen.queryByText("没有找到匹配的节点或公司")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(200));
    expect(replace).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=materials&q=%E5%85%89%E5%88%BB%E8%83%B6",
    );
  });

  it("applies stage-aware search when the search box blurs before debounce", () => {
    vi.useFakeTimers();
    const { replace } = renderAtlas();
    const search = openGlobalSearch();

    fireEvent.change(search, { target: { value: "光刻胶" } });
    fireEvent.blur(search);

    expect(replace).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=materials&q=%E5%85%89%E5%88%BB%E8%83%B6",
    );
    act(() => vi.advanceTimersByTime(200));
    expect(replace).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=materials&q=%E5%85%89%E5%88%BB%E8%83%B6",
    );
  });

  it("keeps the selected stage for unmatched debounced search", () => {
    vi.useFakeTimers();
    const { replace } = renderAtlas();
    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });
    const search = openGlobalSearch();

    fireEvent.click(within(canvas).getByRole("button", { name: /服务器网络/ }));
    fireEvent.change(search, { target: { value: "silicon photonics" } });
    act(() => vi.advanceTimersByTime(200));

    expect(replace).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=server-network&q=silicon+photonics",
    );
  });

  it("uses real-node search to open the HBM stage in the URL", () => {
    vi.useFakeTimers();
    const { replace } = renderAtlas();
    const search = openGlobalSearch();

    fireEvent.change(search, { target: { value: "HBM" } });

    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });
    expect(within(canvas).getByRole("button", { name: /HBM 存储/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("complementary", { name: "HBM 存储流程详情" })).toBeInTheDocument();
    expect(screen.getByTestId("node-hbm")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(200));
    expect(replace).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=hbm-memory&q=HBM",
    );
  });

  it("preserves the selected stage when closing a node drawer", () => {
    const { push, replace } = renderAtlas();
    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });

    fireEvent.click(within(canvas).getByRole("button", { name: /服务器网络/ }));
    expect(replace).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=server-network",
    );

    fireEvent.click(screen.getByTestId("node-ai-server"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(push).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=server-network",
    );
  });

  it("searches within the canvas, reports no results, and resets cleanly", () => {
    vi.useFakeTimers();
    const { replace } = renderAtlas();
    const search = openGlobalSearch();

    fireEvent.change(search, { target: { value: "AVGO" } });
    expect(screen.getByTestId("node-cpo")).toBeInTheDocument();
    expect(screen.queryByTestId("node-hbm")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));

    fireEvent.change(search, { target: { value: "不存在的节点" } });
    expect(screen.getByText("没有找到匹配的节点或公司")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重置搜索" }));
    expect(search).toHaveValue("");
    expect(screen.queryByText("没有找到匹配的节点或公司")).not.toBeInTheDocument();
    expect(replace).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=optical-interconnect",
    );
  });

  it("opens Broadcom research from CPO and returns without losing the node", () => {
    const { push } = renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo"),
    );

    fireEvent.click(screen.getByRole("button", { name: /博通 AVGO/ }));

    const companyDialog = screen.getByRole("dialog", { name: "博通" });
    expect(within(companyDialog).getByText("USD · NASDAQ · US")).toBeInTheDocument();
    expect(within(companyDialog).getAllByText("N/A").length).toBeGreaterThan(0);
    expect(within(companyDialog).getByText("暂无行情数据")).toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=broadcom",
    );

    fireEvent.click(within(companyDialog).getByRole("button", { name: "返回共封装光学" }));
    expect(screen.getByRole("dialog", { name: "共封装光学" })).toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo",
    );
  });

  it("shows confirmed supply evidence only for the relevant companies", () => {
    renderAtlas(new URLSearchParams("layer=chips&mode=supply&node=hbm&company=sk-hynix"));
    const dialog = screen.getByRole("dialog", { name: "SK 海力士" });
    expect(within(dialog).getByText("供应给 英伟达")).toBeInTheDocument();
    expect(within(dialog).getByText("公司确认")).toBeInTheDocument();
    expect(within(dialog).getAllByText("公告日期")).toHaveLength(1);
    const evidence = within(dialog).getByRole("link", {
      name: /NVIDIA and SK hynix Announce Multiyear Technology Partnership/,
    });
    expect(evidence).toHaveAttribute("href", expect.stringMatching(/^https:\/\//));
    expect(evidence).toHaveAttribute("rel", "noreferrer");

    cleanup();
    renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=broadcom"),
    );
    expect(screen.getByText("采购自 台积电")).toBeInTheDocument();
    expect(screen.getByText(/COUPE 光子引擎/)).toBeInTheDocument();
    expect(screen.queryByText("供应给 英伟达")).not.toBeInTheDocument();
  });

  it("hides speculation until requested", () => {
    const speculative: AtlasSnapshot = {
      ...verticalSlice,
      supplyRelations: [
        ...verticalSlice.supplyRelations,
        {
          id: "broadcom--nvidia--speculation",
          supplierId: "broadcom",
          customerId: "nvidia",
          nodeId: "cpo",
          product: "未经确认的 CPO 平台合作",
          status: "market_speculation",
          evidenceSourceIds: ["broadcom-bailly-2024"],
        },
      ],
    };
    renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=broadcom"),
      speculative,
    );

    expect(screen.queryByText("未经确认的 CPO 平台合作")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "显示市场推测" }));
    expect(screen.getByText("未经确认的 CPO 平台合作")).toBeInTheDocument();
    expect(screen.getByText("市场推测")).toBeInTheDocument();
  });

  it("uses company role links coherently and Escape backs out one drawer at a time", () => {
    const { push } = renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=broadcom"),
    );
    const companyDialog = screen.getByRole("dialog", { name: "博通" });
    fireEvent.click(within(companyDialog).getByRole("button", { name: /交换芯片.*Tomahawk/ }));
    expect(screen.getByRole("dialog", { name: "交换 ASIC" })).toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith(
      "?view=canvas&layer=chips&mode=supply&stage=ai-chip&node=switch-asic",
    );

    fireEvent.click(screen.getByRole("button", { name: /博通 AVGO/ }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "交换 ASIC" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the visible node immediately when the company query is invalid", () => {
    const { push } = renderAtlas(
      new URLSearchParams(
        "layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=missing-company",
      ),
    );
    expect(screen.getByRole("dialog", { name: "共封装光学" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=optical-interconnect",
    );
  });

  it("selects the latest market snapshot by absolute time rather than ISO text order", () => {
    const withMarketHistory: AtlasSnapshot = {
      ...verticalSlice,
      marketSnapshots: [
        {
          companyId: "broadcom",
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
          companyId: "broadcom",
          price: 200,
          changePct: 2,
          currency: "USD",
          tradedAt: "2026-07-01T03:00:00Z",
          fetchedAt: "2026-07-01T03:01:00Z",
          delayMinutes: 15,
          ttmEps: 4,
          ttmPe: 50,
        },
      ],
    };
    renderAtlas(
      new URLSearchParams(
        "layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=broadcom",
      ),
      withMarketHistory,
    );

    const dialog = screen.getByRole("dialog", { name: "博通" });
    expect(within(dialog).getByText("USD 200")).toBeInTheDocument();
    expect(within(dialog).getByText("+2%")).toBeInTheDocument();
  });

  it("retains cached and close freshness metadata through canonical parsing", () => {
    const baseMarket = {
      companyId: "broadcom",
      price: 200,
      changePct: 2,
      currency: "USD",
      fetchedAt: "2026-07-01T03:01:00.000Z",
      delayMinutes: 15,
      ttmEps: 4,
      ttmPe: 50,
    } as const;
    const cached = atlasSnapshotSchema.parse({
      ...verticalSlice,
      marketSnapshots: [{
        ...baseMarket,
        tradedAt: "2026-07-01T03:00:00.000Z",
        freshnessSource: "cached",
        cachedAt: "2026-07-01T03:02:00.000Z",
      }],
    });
    renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=broadcom"),
      cached,
    );
    expect(screen.getByText(/^缓存至 /)).toBeInTheDocument();

    cleanup();
    const close = atlasSnapshotSchema.parse({
      ...verticalSlice,
      marketSnapshots: [{
        ...baseMarket,
        tradedAt: "2026-07-01T03:00:00.000Z",
        freshnessSource: "close",
      }],
    });
    renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=broadcom"),
      close,
    );
    expect(screen.getByText("最近收盘")).toBeInTheDocument();
  });

  it("groups evidence by strength and sorts announcements newest first", () => {
    const relation = (
      id: string,
      product: string,
      status: AtlasSnapshot["supplyRelations"][number]["status"],
      announcedAt?: string,
    ): AtlasSnapshot["supplyRelations"][number] => ({
      id,
      supplierId: "broadcom",
      customerId: "nvidia",
      nodeId: "cpo",
      product,
      status,
      evidenceSourceIds: ["broadcom-bailly-2024"],
      announcedAt,
    });
    const evidenceHistory: AtlasSnapshot = {
      ...verticalSlice,
      supplyRelations: [
        relation("confirmed-old", "确认关系旧", "company_confirmed", "2025-01-01"),
        relation("report", "多来源关系", "multi_source_report", "2026-05-01"),
        relation("confirmed-undated", "确认关系未注明日期", "company_confirmed"),
        relation("regulatory", "监管披露关系", "regulatory_disclosure", "2026-06-01"),
        relation("confirmed-new", "确认关系新", "company_confirmed", "2026-01-01"),
        relation("speculation", "市场推测关系", "market_speculation", "2026-07-01"),
      ],
    };
    renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=broadcom"),
      evidenceHistory,
    );
    const dialog = screen.getByRole("dialog", { name: "博通" });
    const headings = within(dialog).getAllByRole("heading", { level: 4 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "公司确认",
      "监管披露",
      "多来源报道",
    ]);
    const content = dialog.textContent ?? "";
    expect(content.indexOf("确认关系新")).toBeLessThan(content.indexOf("确认关系旧"));
    expect(content.indexOf("确认关系旧")).toBeLessThan(content.indexOf("确认关系未注明日期"));
    expect(content).not.toContain("市场推测关系");

    fireEvent.click(within(dialog).getByRole("checkbox", { name: "显示市场推测" }));
    expect(within(dialog).getByRole("heading", { level: 4, name: "市场推测" })).toBeInTheDocument();
    expect(within(dialog).getByText("市场推测关系")).toBeInTheDocument();
  });

  it("clears a valid company together with an invalid return node", () => {
    const { push } = renderAtlas(
      new URLSearchParams(
        "layer=interconnect&mode=supply&node=missing-node&company=broadcom",
      ),
    );
    const dialog = screen.getByRole("dialog", { name: "博通" });
    fireEvent.click(within(dialog).getByRole("button", { name: "返回产业图" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith(
      "?view=canvas&layer=interconnect&mode=supply&stage=optical-interconnect",
    );
  });

  it("restores focus to the connected graph node after company role navigation", async () => {
    renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=broadcom"),
    );
    const companyDialog = screen.getByRole("dialog", { name: "博通" });
    fireEvent.click(
      within(companyDialog).getByRole("button", { name: /交换芯片.*Tomahawk/ }),
    );
    const close = screen.getByRole("button", { name: "关闭详情" });
    await waitFor(() => expect(close).toHaveFocus());
    fireEvent.click(close);

    const connectedNode = screen.getByTestId("node-switch-asic");
    await waitFor(() => expect(connectedNode).toHaveFocus());
    expect(connectedNode.isConnected).toBe(true);
  });

  it("keeps a role-selected node focusable when it does not match the active search", async () => {
    renderAtlas(
      new URLSearchParams(
        "layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo&company=broadcom&q=cpo",
      ),
    );
    const companyDialog = screen.getByRole("dialog", { name: "博通" });
    fireEvent.click(
      within(companyDialog).getByRole("button", { name: /交换芯片.*Tomahawk/ }),
    );

    expect(screen.getByRole("dialog", { name: "交换 ASIC" })).toBeInTheDocument();
    const selectedNode = screen.getByTestId("node-switch-asic");
    expect(selectedNode).toHaveAttribute("data-selected", "true");
    expect(screen.queryByTestId("node-hbm")).not.toBeInTheDocument();

    const close = screen.getByRole("button", { name: "关闭详情" });
    await waitFor(() => expect(close).toHaveFocus());
    fireEvent.click(close);
    await waitFor(() => expect(selectedNode).toHaveFocus());
    expect(selectedNode.isConnected).toBe(true);
  });

  it("restores query state from popstate without remounting", () => {
    render(<AtlasApp initialSnapshot={verticalSlice} />);

    window.history.pushState(
      null,
      "",
      "?view=canvas&layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo",
    );
    fireEvent.popState(window);

    expect(screen.getByRole("heading", { name: "AI 产业链泳道图" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "共封装光学" })).toBeInTheDocument();
  });

  it("moves focus into the drawer and restores it to the triggering node", async () => {
    renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&q=共封装"),
    );
    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });
    expect(within(canvas).getByRole("button", { name: /光互联/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const trigger = screen.getByTestId("node-cpo");
    trigger.focus();
    fireEvent.click(trigger);

    const close = screen.getByRole("button", { name: "关闭详情" });
    await waitFor(() => expect(close).toHaveFocus());
    fireEvent.click(close);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("shows a code-native fallback when the CPO image cannot load", () => {
    renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&stage=optical-interconnect&node=cpo"),
    );
    fireEvent.error(screen.getByRole("img", { name: "CPO 技术剖面示意图" }));

    expect(screen.getByText("技术示意图暂不可用")).toBeInTheDocument();
    expect(screen.getByText("AI 生成技术示意图")).toBeInTheDocument();
  });

  it("writes each discrete history action exactly once in StrictMode", () => {
    const push = vi.fn();
    const replace = vi.fn();
    render(
      <StrictMode>
        <AtlasApp
          initialSnapshot={verticalSlice}
          initialQuery={new URLSearchParams(
            "layer=interconnect&mode=supply&stage=optical-interconnect&q=共封装",
          )}
          historyAdapter={{ push, replace }}
        />
      </StrictMode>,
    );

    fireEvent.click(screen.getByTestId("node-cpo"));
    expect(push).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    push.mockClear();
    const canvas = screen.getByRole("region", { name: "产业链泳道画布" });
    fireEvent.click(within(canvas).getByRole("button", { name: /服务器网络/ }));
    fireEvent.click(screen.getByTestId("node-ai-server"));
    expect(push).toHaveBeenCalledTimes(1);
  });
});

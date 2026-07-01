import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AtlasApp, type AtlasHistoryAdapter } from "@/components/atlas/atlas-app";
import { verticalSlice } from "@/content/seed/vertical-slice";
import type { AtlasSnapshot } from "@/lib/atlas/schema";

afterEach(() => {
  cleanup();
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

describe("AtlasApp", () => {
  it("opens the CPO dialog with the sole raster illustration and code-native detail", () => {
    renderAtlas();

    fireEvent.click(screen.getByTestId("node-cpo"));

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

  it("augments the default supply view with the selected CPO one-hop path", () => {
    renderAtlas();

    fireEvent.click(screen.getByTestId("node-cpo"));

    expect(screen.getByTestId("node-optical-engine")).toHaveAttribute(
      "data-related",
      "true",
    );
    expect(
      screen.getByText("光引擎 → 共封装光学（集成）"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("node-pluggable-optics")).toHaveAttribute(
      "data-related",
      "false",
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("updates layer and relationship mode through canonical shareable URLs", () => {
    const { push } = renderAtlas(
      new URLSearchParams("layer=interconnect&mode=all"),
    );

    fireEvent.click(screen.getByRole("button", { name: "03 核心芯片" }));
    expect(screen.getByRole("heading", { name: "核心芯片 · 产业关系图" })).toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith("?layer=chips&mode=all");

    fireEvent.click(screen.getByRole("button", { name: "直接关系" }));
    expect(screen.getByRole("button", { name: "直接关系" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(push).toHaveBeenLastCalledWith("?layer=chips&mode=supply");
  });

  it("preserves spaces while typing and replaces the canonical search URL after debounce", () => {
    vi.useFakeTimers();
    const { replace } = renderAtlas();
    fireEvent.click(screen.getByRole("button", { name: "01 原材料" }));
    const search = screen.getByRole("searchbox", {
      name: "搜索节点、公司或代码",
    });

    for (const value of ["silicon", "silicon ", "silicon photonics"]) {
      fireEvent.change(search, { target: { value } });
      expect(search).toHaveValue(value);
    }
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(replace).toHaveBeenLastCalledWith(
      "?layer=materials&mode=supply&q=silicon+photonics",
    );
  });

  it("searches within the canvas, reports no results, and resets cleanly", () => {
    vi.useFakeTimers();
    const { replace } = renderAtlas();
    const search = screen.getByRole("searchbox", { name: "搜索节点、公司或代码" });

    fireEvent.change(search, { target: { value: "AVGO" } });
    expect(screen.getByTestId("node-cpo")).toBeInTheDocument();
    expect(screen.queryByTestId("node-ai-cluster")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));

    fireEvent.change(search, { target: { value: "不存在的节点" } });
    expect(screen.getByText("没有找到匹配的节点或公司")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重置搜索" }));
    expect(search).toHaveValue("");
    expect(screen.queryByText("没有找到匹配的节点或公司")).not.toBeInTheDocument();
    expect(replace).toHaveBeenLastCalledWith("?layer=interconnect&mode=supply");
  });

  it("opens Broadcom research from CPO and returns without losing the node", () => {
    const { push } = renderAtlas();
    fireEvent.click(screen.getByTestId("node-cpo"));

    fireEvent.click(screen.getByRole("button", { name: /博通 AVGO/ }));

    const companyDialog = screen.getByRole("dialog", { name: "博通" });
    expect(within(companyDialog).getByText("USD · NASDAQ · US")).toBeInTheDocument();
    expect(within(companyDialog).getAllByText("N/A").length).toBeGreaterThan(0);
    expect(within(companyDialog).getByText("暂无行情数据")).toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith(
      "?layer=interconnect&mode=supply&node=cpo&company=broadcom",
    );

    fireEvent.click(within(companyDialog).getByRole("button", { name: "返回共封装光学" }));
    expect(screen.getByRole("dialog", { name: "共封装光学" })).toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith(
      "?layer=interconnect&mode=supply&node=cpo",
    );
  });

  it("shows confirmed supply evidence only for the relevant companies", () => {
    renderAtlas(new URLSearchParams("layer=chips&mode=supply&node=hbm&company=sk-hynix"));
    const dialog = screen.getByRole("dialog", { name: "SK 海力士" });
    expect(within(dialog).getByText("供应给 英伟达")).toBeInTheDocument();
    expect(within(dialog).getByText("公司确认")).toBeInTheDocument();
    const evidence = within(dialog).getByRole("link", {
      name: /NVIDIA and SK hynix Announce Multiyear Technology Partnership/,
    });
    expect(evidence).toHaveAttribute("href", expect.stringMatching(/^https:\/\//));
    expect(evidence).toHaveAttribute("rel", "noreferrer");

    cleanup();
    renderAtlas(new URLSearchParams("layer=interconnect&mode=supply&node=cpo&company=broadcom"));
    expect(screen.getByText("暂无公开确认的供需关系")).toBeInTheDocument();
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
      new URLSearchParams("layer=interconnect&mode=supply&node=cpo&company=broadcom"),
      speculative,
    );

    expect(screen.queryByText("未经确认的 CPO 平台合作")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "显示市场推测" }));
    expect(screen.getByText("未经确认的 CPO 平台合作")).toBeInTheDocument();
    expect(screen.getByText("市场推测")).toBeInTheDocument();
  });

  it("uses company role links coherently and Escape backs out one drawer at a time", () => {
    const { push } = renderAtlas(
      new URLSearchParams("layer=interconnect&mode=supply&node=cpo&company=broadcom"),
    );
    const companyDialog = screen.getByRole("dialog", { name: "博通" });
    fireEvent.click(within(companyDialog).getByRole("button", { name: /交换芯片.*Tomahawk/ }));
    expect(screen.getByRole("dialog", { name: "交换 ASIC" })).toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith(
      "?layer=chips&mode=supply&node=switch-asic",
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
        "layer=interconnect&mode=supply&node=cpo&company=missing-company",
      ),
    );
    expect(screen.getByRole("dialog", { name: "共封装光学" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith("?layer=interconnect&mode=supply");
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
        "layer=interconnect&mode=supply&node=cpo&company=broadcom",
      ),
      withMarketHistory,
    );

    const dialog = screen.getByRole("dialog", { name: "博通" });
    expect(within(dialog).getByText("USD 200")).toBeInTheDocument();
    expect(within(dialog).getByText("+2%")).toBeInTheDocument();
  });

  it("restores query state from popstate without remounting", () => {
    render(<AtlasApp initialSnapshot={verticalSlice} />);
    fireEvent.click(screen.getByTestId("node-cpo"));
    fireEvent.click(screen.getByRole("button", { name: "03 核心芯片" }));

    window.history.pushState(null, "", "?layer=interconnect&mode=supply&node=cpo");
    fireEvent.popState(window);

    expect(screen.getByRole("heading", { name: "高速互联 · 产业关系图" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "共封装光学" })).toBeInTheDocument();
  });

  it("moves focus into the drawer and restores it to the triggering node", async () => {
    renderAtlas();
    const trigger = screen.getByTestId("node-cpo");
    trigger.focus();
    fireEvent.click(trigger);

    const close = screen.getByRole("button", { name: "关闭详情" });
    await waitFor(() => expect(close).toHaveFocus());
    fireEvent.click(close);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("shows a code-native fallback when the CPO image cannot load", () => {
    renderAtlas();
    fireEvent.click(screen.getByTestId("node-cpo"));
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
          historyAdapter={{ push, replace }}
        />
      </StrictMode>,
    );

    fireEvent.click(screen.getByTestId("node-cpo"));
    expect(push).toHaveBeenCalledTimes(1);

    push.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "03 核心芯片" }));
    expect(push).toHaveBeenCalledTimes(1);
  });
});

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AtlasApp, type AtlasHistoryAdapter } from "@/components/atlas/atlas-app";
import { verticalSlice } from "@/content/seed/vertical-slice";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
});

const renderAtlas = (
  query = new URLSearchParams("layer=interconnect&mode=supply"),
) => {
  const replace = vi.fn();
  const push = vi.fn();
  const historyAdapter: AtlasHistoryAdapter = { push, replace };
  render(
    <AtlasApp
      initialSnapshot={verticalSlice}
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
      screen.getByText("光引擎 → 共封装光学（integrate）"),
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

  it("keeps representative company selection code-native and shareable", () => {
    const { push } = renderAtlas();
    fireEvent.click(screen.getByTestId("node-cpo"));

    fireEvent.click(screen.getByRole("button", { name: /博通 AVGO/ }));

    expect(
      screen.getByText("已选择公司，行情与供需详情将在公司面板加载：博通（AVGO）"),
    ).toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith(
      "?layer=interconnect&mode=supply&node=cpo&company=broadcom",
    );
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
});

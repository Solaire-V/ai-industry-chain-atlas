import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AtlasApp, type AtlasHistoryAdapter } from "@/components/atlas/atlas-app";
import { verticalSlice } from "@/content/seed/vertical-slice";

afterEach(cleanup);

const renderAtlas = (
  query = new URLSearchParams("layer=interconnect&mode=all"),
) => {
  const replace = vi.fn();
  const historyAdapter: AtlasHistoryAdapter = { replace };
  render(
    <AtlasApp
      initialSnapshot={verticalSlice}
      initialQuery={query}
      historyAdapter={historyAdapter}
    />,
  );
  return { replace };
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

  it("highlights the selected node neighborhood and closes the drawer with Escape", () => {
    renderAtlas();

    fireEvent.click(screen.getByTestId("node-cpo"));

    expect(screen.getByTestId("node-optical-engine")).toHaveAttribute(
      "data-related",
      "true",
    );
    expect(screen.getByTestId("node-pluggable-optics")).toHaveAttribute(
      "data-related",
      "false",
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("updates layer and relationship mode through canonical shareable URLs", () => {
    const { replace } = renderAtlas();

    fireEvent.click(screen.getByRole("button", { name: "03 核心芯片" }));
    expect(screen.getByRole("heading", { name: "核心芯片 · 产业关系图" })).toBeInTheDocument();
    expect(replace).toHaveBeenLastCalledWith("?layer=chips&mode=all");

    fireEvent.click(screen.getByRole("button", { name: "直接关系" }));
    expect(screen.getByRole("button", { name: "直接关系" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(replace).toHaveBeenLastCalledWith("?layer=chips&mode=supply");
  });

  it("searches nodes and companies, reports no results, and resets cleanly", () => {
    const { replace } = renderAtlas();
    const search = screen.getByRole("searchbox", {
      name: "搜索节点、公司或代码",
    });

    fireEvent.change(search, { target: { value: "AVGO" } });
    expect(screen.getByTestId("node-cpo")).toBeInTheDocument();
    expect(screen.queryByTestId("node-ai-cluster")).not.toBeInTheDocument();
    expect(replace).toHaveBeenLastCalledWith(
      "?layer=interconnect&mode=all&q=AVGO",
    );

    fireEvent.change(search, { target: { value: "不存在的节点" } });
    expect(screen.getByText("没有找到匹配的节点或公司")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重置搜索" }));
    expect(search).toHaveValue("");
    expect(screen.queryByText("没有找到匹配的节点或公司")).not.toBeInTheDocument();
    expect(replace).toHaveBeenLastCalledWith("?layer=interconnect&mode=all");
  });

  it("keeps representative company selection code-native and shareable", () => {
    const { replace } = renderAtlas();
    fireEvent.click(screen.getByTestId("node-cpo"));

    fireEvent.click(screen.getByRole("button", { name: /博通 AVGO/ }));

    expect(
      screen.getByText("已选择公司，行情与供需详情将在公司面板加载：博通（AVGO）"),
    ).toBeInTheDocument();
    expect(replace).toHaveBeenLastCalledWith(
      "?layer=interconnect&mode=all&node=cpo&company=broadcom",
    );
  });
});

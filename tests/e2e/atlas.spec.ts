import { expect, test } from "@playwright/test";

test("explores the three-layer atlas and opens the CPO drawer", async ({
  page,
}) => {
  await page.goto("/?stage=optical-interconnect");

  await expect(page.getByRole("navigation", { name: "AI 产业链目录" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI 产业链泳道图" })).toBeVisible();
  const canvas = page.getByRole("region", { name: "产业链泳道画布" });
  await expect(canvas).toBeVisible();
  await expect(canvas.getByRole("button", { name: "光互联" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const inspector = page.getByRole("complementary", { name: "光互联流程详情" });
  await expect(inspector).toBeVisible();
  await expect(inspector.getByText("InP / SOI", { exact: true })).toBeVisible();
  await expect(inspector.getByText("光耦合 / 高速测试设备")).toBeVisible();
  await expect(page.getByTestId("node-cpo")).toBeVisible();
  await page.getByRole("button", { name: /行情数据/ }).click();
  await expect(page.getByRole("heading", { name: "行情数据" })).toBeVisible();
  await page.getByRole("button", { name: /主界面/ }).click();
  await expect(page.getByRole("group", { name: "关系模式" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "产业层级" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByTestId("node-cpo").click();
  await expect(
    page.getByRole("dialog", { name: /共封装光学/ }),
  ).toBeVisible();
  await expect(page.getByAltText("CPO 技术剖面示意图")).toBeVisible();

  await page.getByRole("button", { name: /博通 AVGO/ }).click();
  await expect(page).toHaveURL(/company=broadcom/);
  await expect(page.getByRole("dialog", { name: "博通" })).toBeVisible();
  await expect(page.getByText("USD · NASDAQ · US")).toBeVisible();
  await expect(page.getByText("暂无行情数据")).toBeVisible();
});

test("mobile can open CPO from the three-layer atlas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI 产业链泳道图" })).toBeVisible();
  await page
    .getByRole("region", { name: "产业链泳道画布" })
    .getByRole("button", { name: "光互联" })
    .click();
  await expect(page.getByRole("complementary", { name: "光互联流程详情" })).toBeVisible();
  await page.getByTestId("node-cpo").click();
  await expect(
    page.getByRole("dialog", { name: /共封装光学/ }),
  ).toBeVisible();
});

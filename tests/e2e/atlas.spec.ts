import { expect, test } from "@playwright/test";

test("explores CPO and opens a company research drawer", async ({ page }) => {
  await page.goto("/?layer=interconnect&mode=supply&node=cpo");

  await expect(
    page.getByRole("dialog", { name: /共封装光学/ }),
  ).toBeVisible();
  await expect(page.getByAltText("CPO 技术剖面示意图")).toBeVisible();

  await page.getByRole("button", { name: /博通.*AVGO/ }).click();

  const companyDialog = page.getByRole("dialog", { name: "博通" });
  await expect(companyDialog).toBeVisible();
  await expect(companyDialog).toContainText("市盈率 TTM");
  await expect(companyDialog).toContainText(/实时|延迟|最近收盘|缓存|N\/A/);
  await expect(page).toHaveURL(/node=cpo/);
  await expect(page).toHaveURL(/company=broadcom/);
});

test("mobile expands modules and opens the CPO bottom sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "AI 算力模块化地图" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "模块总览" })).toBeVisible();
  await page.getByRole("button", { name: /半导体材料/ }).click();
  await expect(page.getByText("光刻胶")).toBeVisible();
  await page.getByRole("button", { name: /光通信 \/ CPO/ }).click();
  await expect(page.getByText("光引擎 → CPO")).toBeVisible();
  await expect(page.getByRole("group", { name: "关系模式" })).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "产业层级" }),
  ).toHaveCount(0);

  await page.getByTestId("node-cpo").click();

  await expect(
    page.getByRole("dialog", { name: /共封装光学/ }),
  ).toBeVisible();
  await expect(page.getByAltText("CPO 技术剖面示意图")).toBeVisible();
});

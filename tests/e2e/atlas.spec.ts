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

test("mobile exposes the full-chain poster and opens the CPO bottom sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "AI 算力系统连接图谱" }),
  ).toBeVisible();
  await expect(page.getByText("制造使能层")).toBeVisible();
  await expect(page.getByText("半导体前道设备 ⇢ AI 芯片 / 光芯片")).toBeVisible();
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

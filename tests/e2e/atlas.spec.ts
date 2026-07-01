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

test("mobile exposes layer filters and opens the CPO bottom sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const layerToggle = page.getByRole("button", { name: "产业层级" });
  await expect(layerToggle).toBeVisible();
  await layerToggle.click();
  await expect(page.getByRole("navigation", { name: "产业层级" })).toHaveAttribute(
    "data-expanded",
    "true",
  );
  await page.getByRole("button", { name: /04\s*高速互联/ }).click();
  await expect(page.getByRole("navigation", { name: "产业层级" })).toHaveAttribute(
    "data-expanded",
    "false",
  );

  await page.getByTestId("node-cpo").click();

  await expect(
    page.getByRole("dialog", { name: /共封装光学/ }),
  ).toBeVisible();
  await expect(page.getByAltText("CPO 技术剖面示意图")).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("explores the three-layer atlas and opens the CPO drawer", async ({
  page,
}) => {
  await page.goto("/?stage=optical-interconnect&node=cpo");

  await expect(page.getByRole("heading", { name: "AI 产业链三层地图" })).toBeVisible();
  await expect(page.getByRole("region", { name: "AI 产业链 9 段主链" })).toBeVisible();
  await expect(page.getByRole("button", { name: /光互联/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("heading", { name: "光互联完整内部流程图" })).toBeVisible();
  await expect(page.getByText("InP / SOI")).toBeVisible();
  await expect(page.getByText("光耦合 / 高速测试设备")).toBeVisible();
  await expect(page.getByText("CPO")).toBeVisible();
  await expect(page.getByText("公司 / 行情 / PE")).toBeVisible();
  await expect(page.getByRole("group", { name: "关系模式" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "产业层级" })).toHaveCount(0);

  await page.getByTestId("node-cpo").click();
  await expect(
    page.getByRole("dialog", { name: /共封装光学/ }),
  ).toBeVisible();
  await expect(page.getByAltText("CPO 技术剖面示意图")).toBeVisible();
});

test("mobile can scroll the three-layer atlas and open CPO", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI 产业链三层地图" })).toBeVisible();
  await page.getByRole("button", { name: /光互联/ }).click();
  await expect(page.getByRole("heading", { name: "光互联完整内部流程图" })).toBeVisible();
  await page.getByTestId("node-cpo").click();
  await expect(
    page.getByRole("dialog", { name: /共封装光学/ }),
  ).toBeVisible();
});

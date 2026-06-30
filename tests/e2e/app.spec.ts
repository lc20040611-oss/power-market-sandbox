import { expect, test } from "@playwright/test";

test("dashboard loads and shows platform title", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("中国电力市场规则沙盒平台")).toBeVisible();
});

test("simulation page renders multi-period result section", async ({ page }) => {
  await page.goto("/simulation");
  await expect(page.getByText("市场仿真输入")).toBeVisible();
  await page.getByRole("button", { name: "运行仿真" }).click();
  await expect(page.getByText("多时段出清结果")).toBeVisible();
  await expect(page.getByRole("heading", { name: "储能时序优化" })).toBeVisible();
});

test("experiments page runs from template and shows version archive area", async ({ page }) => {
  await page.goto("/experiments");
  await expect(page.getByText("实验管理与参数扫描")).toBeVisible();
  await page.getByRole("button", { name: "运行实验" }).click();
  await expect(page.getByText("实验版本与运行记录")).toBeVisible();
  await expect(page.getByText("实验已存档", { exact: false })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("cell", { name: "新能源渗透率敏感性实验" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /导出 CSV/ })).toBeEnabled();
});

test("experiments page runs contract ratio template with three combinations", async ({ page }) => {
  await page.goto("/experiments");
  await page.getByRole("button", { name: "中长期合约比例敏感性实验" }).first().click();
  await expect(page.getByText("组合数 3")).toBeVisible();
  await page.getByRole("button", { name: "运行实验" }).click();
  await expect(page.getByText("实验已存档", { exact: false })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("cell", { name: "中长期合约比例=0.3" }).first()).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("renders, searches, filters, and opens a test detail", async ({ page }) => {
  await page.goto("/xet-nghiem");
  await expect(
    page.getByRole("heading", { name: "Danh sách xét nghiệm" }),
  ).toBeVisible();
  await expect(
    page.locator("h3:visible", { hasText: "Complete Blood Count" }),
  ).toBeVisible();

  await page.getByPlaceholder("Tìm theo tên xét nghiệm").fill("CBC");
  await page.getByRole("button", { name: "Tìm kiếm" }).click();
  await expect(page).toHaveURL(/search=CBC/);
  await expect(
    page.locator("h3:visible", { hasText: "Complete Blood Count" }),
  ).toBeVisible();

  await page.locator('input[name="homeCollectable"]:visible').check();
  await page.getByRole("button", { name: "Tìm kiếm" }).click();
  await expect(page).toHaveURL(/homeCollectable=true/);

  await page.locator("a:visible", { hasText: "Chi tiết" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Thông tin mẫu xét nghiệm" }),
  ).toBeVisible();
});

test("renders the empty state", async ({ page }) => {
  await page.goto("/xet-nghiem?search=NO_MATCH_SYNTHETIC_TEST");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy xét nghiệm" }),
  ).toBeVisible();
});

test("does not overflow horizontally", async ({ page }) => {
  await page.goto("/xet-nghiem");
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));

  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

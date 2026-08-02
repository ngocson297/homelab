import { expect, test } from "@playwright/test";

test("redirects an unauthenticated admin request to the login form", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Đăng nhập nhân viên" })).toBeVisible();
  await expect(page.locator("#admin-password")).toHaveAttribute("type", "password");
});

test("admin login page does not overflow on mobile or desktop", async ({ page }) => {
  await page.goto("/admin/login");
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

import { expect, test } from "@playwright/test";

test("completes the catalog, cart, booking, and confirmation flow", async ({
  page,
}) => {
  await page.goto("/xet-nghiem?homeCollectable=true");
  await page.getByRole("button", { name: /Thêm .* vào giỏ/ }).first().click();
  await page.getByRole("link", { name: /Giỏ xét nghiệm, 1 xét nghiệm/ }).click();

  await expect(page).toHaveURL(/gio-xet-nghiem/);
  await page.getByRole("link", { name: "Tiếp tục đặt lịch" }).click();
  await expect(page).toHaveURL(/dat-lich$/);

  await page.getByLabel("Họ và tên").fill("Synthetic Browser Customer");
  await page.getByLabel("Số điện thoại").fill("0900000000");
  await page.getByLabel("Ngày lấy mẫu").fill("2099-08-05");
  await page.getByLabel("Khung giờ").selectOption("07:00-09:00");
  await page.getByLabel("Tỉnh / thành phố").fill("Da Nang");
  await page.getByLabel("Quận / huyện").fill("Hai Chau");
  await page.getByLabel("Phường / xã").fill("Hoa Cuong");
  await page.getByLabel("Địa chỉ cụ thể").fill("Synthetic browser address");
  await page.getByRole("button", { name: "Xác nhận đặt lịch" }).click();

  await expect(page).toHaveURL(/dat-lich\/thanh-cong/);
  await expect(page.getByText("Đặt lịch thành công")).toBeVisible();
  await expect(page.getByText(/^HL-\d{8}-[A-F0-9]{12}$/)).toBeVisible();
  await expect(page.getByText("Đã xác nhận")).toBeVisible();
  await expect(page.getByRole("link", { name: /Giỏ xét nghiệm, 0 xét nghiệm/ })).toBeVisible();
});

test("redirects an empty cart away from booking", async ({ page }) => {
  await page.goto("/dat-lich");
  await expect(page).toHaveURL(/gio-xet-nghiem/);
  await expect(page.getByText("Giỏ xét nghiệm đang trống")).toBeVisible();
});

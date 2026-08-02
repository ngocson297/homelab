import { expect, test } from "@playwright/test";

test("books and securely looks up an order", async ({ page }) => {
  await page.goto("/xet-nghiem?homeCollectable=true");
  await page.getByRole("button", { name: /Thêm .* vào giỏ/ }).first().click();
  await page.getByRole("link", { name: /Giỏ xét nghiệm, 1 xét nghiệm/ }).click();
  await page.getByRole("link", { name: "Tiếp tục đặt lịch" }).click();

  await page.getByLabel("Họ và tên", { exact: true }).fill("Synthetic Browser Customer");
  await page.getByLabel("Số điện thoại").fill("0900000000");
  await page.getByLabel("Họ và tên người được xét nghiệm").fill("Synthetic Browser Subject");
  await page.getByLabel("Ngày sinh").fill("1990-01-20");
  await page.getByLabel("Giới tính dùng cho thông tin xét nghiệm").selectOption("UNKNOWN");
  await page.getByLabel("Ngày lấy mẫu").fill("2099-08-05");
  await page.getByLabel("Khung giờ").selectOption("07:00-09:00");
  await page.getByLabel("Tỉnh / thành phố").fill("Da Nang");
  await page.getByLabel("Quận / huyện").fill("Hai Chau");
  await page.getByLabel("Phường / xã").fill("Hoa Cuong");
  await page.getByLabel("Địa chỉ cụ thể").fill("Synthetic browser address");
  await page.getByRole("button", { name: "Xác nhận đặt lịch" }).click();

  await expect(page).toHaveURL(/dat-lich\/thanh-cong/);
  const codeElement = page.getByText(/^HL-\d{8}-[A-F0-9]{12}$/);
  const orderCode = await codeElement.textContent();
  expect(orderCode).toBeTruthy();
  await expect(page.getByText("Chờ xác nhận")).toBeVisible();
  await expect(page.getByRole("link", { name: /Giỏ xét nghiệm, 0 xét nghiệm/ })).toBeVisible();

  await page.getByRole("link", { name: "Tra cứu đơn hàng" }).click();
  await expect(page).toHaveURL(/tra-cuu-don-hang/);
  await expect(page.getByLabel("Mã đơn")).toHaveValue(orderCode ?? "");
  await page.getByLabel("Số điện thoại").fill("0900-000-000");
  await page.getByRole("button", { name: "Tra cứu" }).click();
  await expect(page.getByText("******0000")).toBeVisible();
  await expect(page.getByRole("list", { name: "Dòng thời gian trạng thái đơn" })).toBeVisible();
  await expect(page.getByText("Synthetic browser address")).toHaveCount(0);

  await page.getByLabel("Số điện thoại").fill("0911111111");
  await page.getByRole("button", { name: "Tra cứu" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Không tìm thấy đơn phù hợp với thông tin đã cung cấp." })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Mã đơn")).toHaveValue(orderCode ?? "");
  await expect(page.getByLabel("Số điện thoại")).toHaveValue("");
});

test("redirects an empty cart away from booking", async ({ page }) => {
  await page.goto("/dat-lich");
  await expect(page).toHaveURL(/gio-xet-nghiem/);
  await expect(page.getByText("Giỏ xét nghiệm đang trống")).toBeVisible();
});

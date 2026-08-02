import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrderLookup } from "@/components/order-lookup";
import { LAST_ORDER_SESSION_KEY } from "@/components/booking-result-provider";

const publicOrder = {
  orderCode: "HL-20260802-A1B2C3D4E5F6",
  status: "PENDING_CONFIRMATION",
  statusLabel: "Chờ xác nhận",
  contact: { maskedPhone: "******0000" },
  appointment: { scheduledDate: "2099-08-05T01:00:00.000Z", timeSlot: "07:00-09:00", province: "Đà Nẵng", district: "Hải Châu", ward: "Hòa Cường" },
  items: [{ testCode: "CBC", testName: "Synthetic Blood Test", specimenType: "Whole blood", price: "150000" }],
  subtotal: "150000", collectionFee: "30000", totalAmount: "180000",
  timeline: [{ status: "PENDING_CONFIRMATION", title: "Đã tiếp nhận yêu cầu", description: "HomeLab đã nhận được yêu cầu đặt lịch của bạn.", occurredAt: "2026-08-02T00:00:00.000Z" }],
  createdAt: "2026-08-02T00:00:00.000Z",
};

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("public order lookup", () => {
  it("renders accessible fields and validates both credentials", async () => {
    render(<OrderLookup />);
    expect(screen.getByText("Chưa có kết quả tra cứu. Hãy nhập đầy đủ thông tin ở trên.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Tra cứu" }));
    expect(screen.getByText("Vui lòng nhập mã đơn.")).toBeVisible();
    expect(screen.getByText("Vui lòng nhập số điện thoại.")).toBeVisible();
    expect(screen.getByLabelText("Mã đơn")).toHaveAttribute("aria-invalid", "true");
  });

  it("prefills only the order code from safe session state", async () => {
    sessionStorage.setItem(LAST_ORDER_SESSION_KEY, publicOrder.orderCode);
    render(<OrderLookup />);
    await waitFor(() => expect(screen.getByLabelText("Mã đơn")).toHaveValue(publicOrder.orderCode));
    expect(screen.getByLabelText("Số điện thoại")).toHaveValue("");
  });

  it("submits once by keyboard and renders only masked public data", async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(json(publicOrder)));
    vi.stubGlobal("fetch", fetchMock);
    render(<OrderLookup />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Mã đơn"), publicOrder.orderCode);
    await user.type(screen.getByLabelText("Số điện thoại"), "0900 000 000{enter}");
    expect(await screen.findByText(publicOrder.statusLabel)).toBeVisible();
    expect(screen.getByText("******0000")).toBeVisible();
    expect(screen.getByText("Đã tiếp nhận yêu cầu")).toBeVisible();
    expect(screen.queryByText("0900000000")).not.toBeInTheDocument();
    expect(screen.queryByText("Synthetic full address")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toMatch(/\/orders\/lookup$/);
    expect(String(url)).not.toContain("0900");
    expect(init?.method).toBe("POST");
  });

  it.each([
    [404, "Không tìm thấy đơn phù hợp với thông tin đã cung cấp."],
    [429, "Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau."],
    [500, "Hệ thống chưa thể tra cứu đơn lúc này."],
  ])("shows a friendly API error for %s", async (status, message) => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ message: "raw stack" }, status))));
    await submitValidForm();
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByText("raw stack")).not.toBeInTheDocument();
  });

  it("shows a friendly network error without retrying", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError("network")));
    vi.stubGlobal("fetch", fetchMock);
    await submitValidForm();
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể kết nối tới hệ thống. Vui lòng thử lại.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

async function submitValidForm() {
  render(<OrderLookup />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Mã đơn"), publicOrder.orderCode);
  await user.type(screen.getByLabelText("Số điện thoại"), "0900000000");
  await user.click(screen.getByRole("button", { name: "Tra cứu" }));
}

function json(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } }); }

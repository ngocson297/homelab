import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingSuccess } from "@/components/booking-success";
import { BookingResultProvider, LAST_ORDER_SESSION_KEY } from "@/components/booking-result-provider";
import { CartProvider } from "@/components/cart-provider";
import { BookingForm } from "@/components/booking-form";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

beforeEach(() => { navigation.push.mockReset(); navigation.replace.mockReset(); localStorage.clear(); sessionStorage.clear(); });

describe("booking flow security integration", () => {
  it("redirects an empty cart away from booking", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<CartProvider><BookingResultProvider><BookingForm /></BookingResultProvider></CartProvider>);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/gio-xet-nghiem"));
  });

  it("shows field errors before sending an invalid form", async () => {
    localStorage.setItem("homelab.lab-test-cart.v2", JSON.stringify(["82a71194-33ee-4e6a-86f5-967f0eea8789"]));
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ id: "82a71194-33ee-4e6a-86f5-967f0eea8789", code: "CBC", name: "Synthetic Test", specimenType: "Blood", containerType: "Tube", turnaroundTimeHours: 1, homeCollectable: true, price: "100000", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", description: null, minimumVolumeMl: null, preparationInstruction: null }), { status: 200, headers: { "Content-Type": "application/json" } }))));
    render(<CartProvider><BookingResultProvider><BookingForm /></BookingResultProvider></CartProvider>);
    await screen.findByLabelText("Họ và tên");
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận đặt lịch" }));
    expect(await screen.findByText("Vui lòng nhập họ và tên.")).toBeVisible();
    expect(screen.getByText("Vui lòng nhập số điện thoại.")).toBeVisible();
  });

  it("does not fetch order details after refresh and links to secure lookup", () => {
    sessionStorage.setItem(LAST_ORDER_SESSION_KEY, "HL-20260802-A1B2C3D4E5F6");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    render(<BookingResultProvider><BookingSuccess /></BookingResultProvider>);
    expect(screen.getByRole("heading", { name: "Không có đơn vừa tạo" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Tra cứu đơn hàng" })).toHaveAttribute("href", "/tra-cuu-don-hang");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

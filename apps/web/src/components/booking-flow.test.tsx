import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingForm } from "@/components/booking-form";
import {
  BookingResultProvider,
  LAST_ORDER_SESSION_KEY,
} from "@/components/booking-result-provider";
import { BookingSuccess } from "@/components/booking-success";
import { CartProvider } from "@/components/cart-provider";
import { CART_STORAGE_KEY } from "@/lib/cart-state";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const labTestId = "82a71194-33ee-4e6a-86f5-967f0eea8789";
const labTest = {
  id: labTestId,
  code: "CBC",
  name: "Complete Blood Count",
  description: null,
  specimenType: "Whole blood",
  containerType: "EDTA tube",
  minimumVolumeMl: "2",
  preparationInstruction: null,
  turnaroundTimeHours: 24,
  homeCollectable: true,
  price: "150000",
  status: "ACTIVE",
  createdAt: "2026-08-02T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};
const order = {
  orderCode: "HL-20260802-A1B2C3D4E5F6",
  status: "CONFIRMED",
  items: [
    {
      labTestId,
      testCode: "CBC",
      testName: "Complete Blood Count",
      specimenType: "Whole blood",
      price: "150000",
    },
  ],
  appointment: {
    scheduledDate: "2099-08-05T00:00:00.000Z",
    timeSlot: "07:00-09:00",
    province: "Da Nang",
    district: "Hai Chau",
    ward: "Hoa Cuong",
    addressLine: "Synthetic address",
    note: null,
    status: "SCHEDULED",
  },
  subtotal: "150000",
  collectionFee: "30000",
  totalAmount: "180000",
  createdAt: "2026-08-02T00:00:00.000Z",
};

beforeEach(() => {
  navigation.push.mockReset();
  navigation.replace.mockReset();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

describe("booking flow", () => {
  it("redirects an empty cart away from booking", async () => {
    vi.stubGlobal("fetch", vi.fn());
    renderBookingForm();
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/gio-xet-nghiem"),
    );
  });

  it("renders the form and field-level validation errors", async () => {
    installFetchMock();
    renderBookingFormWithCart();
    const user = userEvent.setup();

    expect(
      await screen.findByRole("heading", {
        name: "Thông tin liên hệ và lịch hẹn",
      }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Xác nhận đặt lịch" }));
    expect(await screen.findByText("Vui lòng nhập họ và tên.")).toBeVisible();
    expect(screen.getByText("Vui lòng nhập số điện thoại.")).toBeVisible();
    expect(screen.getByText("Vui lòng chọn ngày lấy mẫu.")).toBeVisible();
    expect(screen.getByText("Vui lòng chọn khung giờ lấy mẫu.")).toBeVisible();
    expect(screen.getAllByText("Trường này là bắt buộc.")).toHaveLength(4);
  });

  it("rejects a past date next to the date field", async () => {
    installFetchMock();
    renderBookingFormWithCart();
    const user = userEvent.setup();
    await screen.findByLabelText("Ngày lấy mẫu");
    await fillRequiredForm(user, "2020-01-01");
    await user.click(screen.getByRole("button", { name: "Xác nhận đặt lịch" }));
    expect(
      await screen.findByText("Ngày lấy mẫu không được nằm trong quá khứ."),
    ).toBeVisible();
  });

  it("submits once, clears the cart, and stores only the order code", async () => {
    const fetchMock = installFetchMock();
    renderBookingFormWithCart();
    const user = userEvent.setup();
    await screen.findByLabelText("Họ và tên");
    await fillRequiredForm(user);
    const submit = screen.getByRole("button", { name: "Xác nhận đặt lịch" });
    await user.dblClick(submit);

    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/dat-lich/thanh-cong"),
    );
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBe("[]");
    expect(sessionStorage.getItem(LAST_ORDER_SESSION_KEY)).toBe(order.orderCode);
    const postCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(postCalls).toHaveLength(1);
    const body: unknown = JSON.parse(String(postCalls[0]?.[1]?.body));
    expect(body).toEqual(
      expect.objectContaining({
        labTestIds: [labTestId],
        contactName: "Synthetic Customer",
        contactPhone: "0900000000",
      }),
    );
    expect(body).not.toHaveProperty("price");
    expect(body).not.toHaveProperty("subtotal");
    expect(body).not.toHaveProperty("testName");
  });

  it.each([
    ["api", "Thông tin đặt lịch chưa hợp lệ."],
    ["network", "Không thể kết nối tới hệ thống."],
  ])("shows a friendly %s error without navigating", async (kind, message) => {
    installFetchMock(kind);
    renderBookingFormWithCart();
    const user = userEvent.setup();
    await screen.findByLabelText("Họ và tên");
    await fillRequiredForm(user);
    await user.click(screen.getByRole("button", { name: "Xác nhận đặt lịch" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("restores and displays the backend response on the success page", async () => {
    sessionStorage.setItem(LAST_ORDER_SESSION_KEY, order.orderCode);
    installFetchMock();
    render(
      <BookingResultProvider>
        <BookingSuccess />
      </BookingResultProvider>,
    );
    expect(await screen.findByText(order.orderCode)).toBeVisible();
    expect(screen.getByText("Complete Blood Count")).toBeVisible();
    expect(screen.getByText("Đã xác nhận")).toBeVisible();
    expect(screen.getByText(/180[.\s]000/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Tra cứu đơn" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

function renderBookingForm() {
  return render(
    <CartProvider>
      <BookingResultProvider>
        <BookingForm />
      </BookingResultProvider>
    </CartProvider>,
  );
}

function renderBookingFormWithCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([labTestId]));
  return renderBookingForm();
}

async function fillRequiredForm(
  user: ReturnType<typeof userEvent.setup>,
  scheduledDate = "2099-08-05",
) {
  await user.type(screen.getByLabelText("Họ và tên"), "  Synthetic Customer  ");
  await user.type(screen.getByLabelText("Số điện thoại"), "0900000000");
  await user.type(screen.getByLabelText("Ngày lấy mẫu"), scheduledDate);
  await user.selectOptions(screen.getByLabelText("Khung giờ"), "07:00-09:00");
  await user.type(screen.getByLabelText("Tỉnh / thành phố"), "Da Nang");
  await user.type(screen.getByLabelText("Quận / huyện"), "Hai Chau");
  await user.type(screen.getByLabelText("Phường / xã"), "Hoa Cuong");
  await user.type(screen.getByLabelText("Địa chỉ cụ thể"), "Synthetic address");
}

function installFetchMock(failure?: string) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url.includes(`/lab-tests/${labTestId}`)) return jsonResponse(labTest);
    if (init?.method === "POST") {
      if (failure === "api")
        return jsonResponse({ message: "Synthetic invalid request" }, 400);
      if (failure === "network") throw new TypeError("Synthetic network error");
      return jsonResponse(order, 201);
    }
    if (url.includes(`/orders/${order.orderCode}`)) return jsonResponse(order);
    throw new Error(`Unexpected synthetic request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

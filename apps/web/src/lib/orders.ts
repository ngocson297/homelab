export type CreateOrderInput = {
  labTestIds: string[];
  contactName: string;
  contactPhone: string;
  appointment: {
    scheduledDate: string;
    timeSlot: string;
    province: string;
    district: string;
    ward: string;
    addressLine: string;
    note: string | null;
  };
};

export type OrderResponse = {
  orderCode: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  items: Array<{
    labTestId: string;
    testCode: string;
    testName: string;
    specimenType: string;
    price: string;
  }>;
  appointment: {
    scheduledDate: string;
    timeSlot: string;
    province: string;
    district: string;
    ward: string;
    addressLine: string;
    note: string | null;
    status: "SCHEDULED" | "RESCHEDULED" | "CANCELLED";
  };
  subtotal: string;
  collectionFee: string;
  totalAmount: string;
  createdAt: string;
};

export class OrderApiError extends Error {
  constructor(
    message: string,
    readonly kind: "api" | "network" | "invalid-response",
    readonly status?: number,
  ) {
    super(message);
  }
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const requestTimeoutMs = 10_000;

export async function createOrder(input: CreateOrderInput): Promise<OrderResponse> {
  return requestOrder("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function getOrder(orderCode: string): Promise<OrderResponse> {
  return requestOrder(`/orders/${encodeURIComponent(orderCode)}`, {
    method: "GET",
  });
}

async function requestOrder(path: string, init: RequestInit): Promise<OrderResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch {
    throw new OrderApiError(
      "Không thể kết nối tới hệ thống. Vui lòng kiểm tra mạng và thử lại.",
      "network",
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = readApiMessage(payload);
    const prefix =
      response.status === 400
        ? "Thông tin đặt lịch chưa hợp lệ."
        : response.status === 404
          ? "Không tìm thấy thông tin phù hợp."
          : "Hệ thống chưa thể tạo đơn lúc này.";
    throw new OrderApiError(
      detail ? `${prefix} ${detail}` : prefix,
      "api",
      response.status,
    );
  }

  if (!isOrderResponse(payload)) {
    throw new OrderApiError(
      "Hệ thống trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.",
      "invalid-response",
    );
  }
  return payload;
}

function readApiMessage(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (typeof value.message === "string") return value.message;
  if (Array.isArray(value.message)) {
    const messages = value.message.filter(
      (message): message is string => typeof message === "string",
    );
    return messages.length > 0 ? messages.join(" ") : null;
  }
  return null;
}

function isOrderResponse(value: unknown): value is OrderResponse {
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.appointment)) {
    return false;
  }
  return (
    typeof value.orderCode === "string" &&
    isOrderStatus(value.status) &&
    value.items.every(isOrderItem) &&
    typeof value.appointment.scheduledDate === "string" &&
    typeof value.appointment.timeSlot === "string" &&
    typeof value.appointment.province === "string" &&
    typeof value.appointment.district === "string" &&
    typeof value.appointment.ward === "string" &&
    typeof value.appointment.addressLine === "string" &&
    (typeof value.appointment.note === "string" || value.appointment.note === null) &&
    isAppointmentStatus(value.appointment.status) &&
    typeof value.subtotal === "string" &&
    typeof value.collectionFee === "string" &&
    typeof value.totalAmount === "string" &&
    typeof value.createdAt === "string"
  );
}

function isOrderItem(value: unknown): value is OrderResponse["items"][number] {
  return (
    isRecord(value) &&
    typeof value.labTestId === "string" &&
    typeof value.testCode === "string" &&
    typeof value.testName === "string" &&
    typeof value.specimenType === "string" &&
    typeof value.price === "string"
  );
}

function isOrderStatus(value: unknown): value is OrderResponse["status"] {
  return value === "DRAFT" || value === "CONFIRMED" || value === "CANCELLED";
}

function isAppointmentStatus(
  value: unknown,
): value is OrderResponse["appointment"]["status"] {
  return value === "SCHEDULED" || value === "RESCHEDULED" || value === "CANCELLED";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrder, OrderApiError, type CreateOrderInput } from "@/lib/orders";

const input: CreateOrderInput = {
  labTestIds: ["lab-id"],
  contactName: "Synthetic Customer",
  contactPhone: "0900000000",
  subject: { fullName: "Synthetic Subject", dateOfBirth: "1990-01-20", sex: "UNKNOWN", relationshipToContact: null },
  appointment: {
    scheduledDate: "2026-08-05T07:00:00+07:00",
    timeSlot: "07:00-09:00",
    province: "Da Nang",
    district: "Hai Chau",
    ward: "Hoa Cuong",
    addressLine: "Synthetic address",
    note: null,
  },
};

const responseBody = {
  orderCode: "HL-20260802-A1B2C3D4E5F6",
  status: "CONFIRMED",
  items: [
    {
      labTestId: "lab-id",
      testCode: "CBC",
      testName: "Complete Blood Count",
      specimenType: "Whole blood",
      price: "150000",
    },
  ],
  appointment: {
    scheduledDate: "2026-08-05T00:00:00.000Z",
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

afterEach(() => vi.unstubAllGlobals());

describe("orders API client", () => {
  it("posts only the supplied contract and parses a valid order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createOrder(input)).resolves.toEqual(responseBody);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual(input);
  });

  it("preserves a 400 response as a friendly API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: ["labTestIds must be unique"] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    await expect(createOrder(input)).rejects.toMatchObject({
      kind: "api",
      status: 400,
    } satisfies Partial<OrderApiError>);
  });

  it("reports network errors without retrying the POST", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Network failed"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(createOrder(input)).rejects.toMatchObject({ kind: "network" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed successful responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ orderCode: "incomplete" }), { status: 201 }),
      ),
    );
    await expect(createOrder(input)).rejects.toMatchObject({
      kind: "invalid-response",
    });
  });
});

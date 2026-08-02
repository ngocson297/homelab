import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminApiError, cancelAdminOrder, confirmAdminOrder, formatMoney, getAdminOrders, rescheduleAdminOrder } from "@/lib/admin-orders";
afterEach(() => vi.unstubAllGlobals());
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
describe("admin order API client", () => {
  it("keeps filters in the GET query and includes staff credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: [], pagination: { page: 2, limit: 20, total: 0, totalPages: 0 } })); vi.stubGlobal("fetch", fetchMock);
    await getAdminOrders("page=2&status=CONFIRMED");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("page=2&status=CONFIRMED");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include", cache: "no-store" });
  });
  it("sends only expectedVersion when confirming", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({})); vi.stubGlobal("fetch", fetchMock);
    await confirmAdminOrder("HL-SYNTHETIC", 3);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ expectedVersion: 3 });
  });
  it("does not retry stale mutations", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 409)); vi.stubGlobal("fetch", fetchMock);
    await expect(cancelAdminOrder("HL-SYNTHETIC", 1, "Synthetic reason")).rejects.toMatchObject({ status: 409 } satisfies Partial<AdminApiError>);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("sends reschedule reason and formats Decimal strings as VND", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({})); vi.stubGlobal("fetch", fetchMock);
    await rescheduleAdminOrder("HL-SYNTHETIC", { expectedVersion: 2, scheduledDate: "2026-08-06T02:00:00.000Z", timeSlot: "09:00-11:00", reason: "Synthetic reason" });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ expectedVersion: 2, timeSlot: "09:00-11:00" });
    expect(formatMoney("120000")).toContain("120.000");
  });
});

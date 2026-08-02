import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSpecimenSection } from "@/components/admin-specimens";
import { CollectorOrderDetailView } from "@/components/collector-order-detail";
import { LabIntake } from "@/components/lab-intake";
import { LabLoginForm } from "@/components/lab-login-form";
import type { AdminOrderDetail } from "@/lib/admin-orders";
import type { CollectorOrderDetail } from "@/lib/collector-portal";
import type { LabSpecimenDetail } from "@/lib/lab-portal";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
const operationId = "00000000-0000-4000-8000-000000000011";

beforeEach(() => {
  navigation.replace.mockReset();
  navigation.refresh.mockReset();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("crypto", { randomUUID: () => operationId });
});
afterEach(() => vi.unstubAllGlobals());

describe("Ticket 12 protected specimen workflows", () => {
  it("shows manual-review warning and prints a local protected label", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ orderCode: "HL-SYNTH", labels: [{ specimenCode: "SPC-SYNTH", barcodeValue: "OPAQUE_SYNTH_123", symbology: "CODE_128", specimenType: "Blood", containerType: "Tube", targetVolumeMl: "3.5", labelCount: 1 }] })).mockResolvedValueOnce(json({ orderCode: "HL-SYNTH", recorded: 1, idempotent: false }));
    vi.stubGlobal("fetch", fetchMock);
    const print = vi.fn(); Object.defineProperty(window, "print", { configurable: true, value: print });
    render(<AdminSpecimenSection order={adminOrder()} onChanged={vi.fn()} />);
    expect(screen.getByText("Cần rà soát cấu hình lấy mẫu thủ công.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Xem và in nhãn" }));
    expect(await screen.findByRole("dialog", { name: "Xem trước nhãn bệnh phẩm" })).toBeVisible();
    expect(screen.getByAltText("Barcode của SPC-SYNTH")).toHaveAttribute("src", expect.stringMatching(/^data:image\/svg\+xml/));
    await userEvent.click(screen.getByRole("button", { name: "In nhãn" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("OPAQUE_SYNTH_123");
    expect(String(fetchMock.mock.calls[1]?.[1]?.body)).not.toContain("OPAQUE_SYNTH_123");
    expect(localStorage).toHaveLength(0); expect(sessionStorage).toHaveLength(0);
  });

  it("requires every distinct collector barcode before collecting", async () => {
    const initial = collectorOrder();
    const updated = { ...initial, status: "COLLECTED", statusLabel: "Đã lấy mẫu", version: 8 };
    const fetchMock = vi.fn().mockResolvedValueOnce(json(initial)).mockResolvedValueOnce(json(updated));
    vi.stubGlobal("fetch", fetchMock);
    render(<CollectorOrderDetailView orderCode="HL-SYNTH" />);
    await userEvent.click(await screen.findByRole("button", { name: "Quét và ghi nhận lấy mẫu" }));
    const barcodeInputs = screen.getAllByLabelText("Quét barcode");
    await userEvent.type(barcodeInputs[0], "OPAQUE-A");
    await userEvent.type(barcodeInputs[1], "OPAQUE-A");
    expect(screen.getByText("Không được dùng cùng một barcode cho nhiều bệnh phẩm.")).toBeVisible();
    await userEvent.clear(barcodeInputs[1]); await userEvent.type(barcodeInputs[1], "OPAQUE-B");
    for (const label of ["Đã xác nhận họ và tên.", "Đã xác nhận ngày sinh.", "Đã nhận được sự đồng ý lấy mẫu."]) await userEvent.click(screen.getByLabelText(label));
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:3001/collector/orders/HL-SYNTH/collect-specimens");
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(body.specimens).toEqual([{ barcodeValue: "OPAQUE-A" }, { barcodeValue: "OPAQUE-B" }]);
    expect(localStorage).toHaveLength(0); expect(sessionStorage).toHaveLength(0);
  });

  it("scans through a body, validates receive assessment, and keeps barcode out of storage and URL", async () => {
    const scanned = labSpecimen();
    const received = { ...scanned, status: "RECEIVED", version: 4, receivedAt: "2026-08-05T04:00:00.000Z" };
    const fetchMock = vi.fn().mockResolvedValueOnce(json(scanned)).mockResolvedValueOnce(json(received));
    vi.stubGlobal("fetch", fetchMock);
    render(<LabIntake />);
    const input = screen.getByLabelText("Quét barcode");
    await userEvent.type(input, "OPAQUE-LAB-SCAN{enter}");
    expect(await screen.findByText("SPC-SYNTH")).toBeVisible();
    expect(input).toHaveValue("");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:3001/lab/specimens/scan");
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("OPAQUE-LAB-SCAN");
    await userEvent.click(screen.getByRole("button", { name: "Tiếp nhận" }));
    expect(screen.getByRole("alert")).toHaveTextContent("hãy dùng luồng Từ chối");
    for (const label of ["Nhãn đọc được", "Ống chứa nguyên vẹn", "Điều kiện vận chuyển phù hợp"]) await userEvent.click(screen.getByLabelText(label));
    await userEvent.click(screen.getByRole("button", { name: "Tiếp nhận" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1]?.[1]?.body)).not.toMatch(/barcode|displayName|dateOfBirth/i);
    expect(localStorage).toHaveLength(0); expect(sessionStorage).toHaveLength(0);
  });

  it("revokes a wrong-role login session", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ user: { email: "synthetic@homelab.test", fullName: "Synthetic Staff", role: "ADMIN" } })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LabLoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "synthetic@homelab.test");
    await userEvent.type(screen.getByLabelText("Mật khẩu"), "Synthetic1234");
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("không có quyền truy cập");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:3001/auth/staff/logout");
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});

function adminOrder(): AdminOrderDetail {
  return { orderCode: "HL-SYNTH", status: "CONFIRMED", statusLabel: "Đã xác nhận", version: 2, contact: { name: "Synthetic Contact", phone: "0900000000" }, subject: { fullName: "Synthetic Subject", dateOfBirth: "1990-01-01", sex: "FEMALE", relationshipToContact: null }, collectionAttempts: [], requiresCollectionAttention: false, requiresRecollection: false, specimens: [{ specimenCode: "SPC-SYNTH", status: "LABELED", specimenType: "Blood", containerType: "Tube", targetVolumeMl: "3.5", requiresManualReview: true, linkedTests: [{ testCode: "SYN", testName: "Synthetic Test" }] }], appointment: { scheduledDate: "2026-08-05T01:00:00.000Z", timeSlot: "07:00-09:00", province: "Synthetic Province", district: "Synthetic District", ward: "Synthetic Ward", addressLine: "Synthetic Address", note: null, status: "SCHEDULED" }, items: [{ testCode: "SYN", testName: "Synthetic Test", specimenType: "Blood", price: "100000" }], subtotal: "100000", collectionFee: "0", totalAmount: "100000", timeline: [], currentCollector: null, createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" };
}
function collectorOrder(): CollectorOrderDetail {
  return { orderCode: "HL-SYNTH", status: "COLLECTOR_ON_THE_WAY", statusLabel: "Đang di chuyển", version: 7, contact: { name: "Synthetic Contact", phone: "0900000000" }, subject: { fullName: "Synthetic Subject", dateOfBirth: "1990-01-01", sex: "FEMALE", relationshipToContact: null }, appointment: { scheduledDate: "2026-08-05T01:00:00.000Z", timeSlot: "07:00-09:00", province: "Synthetic Province", district: "Synthetic District", ward: "Synthetic Ward", addressLine: "Synthetic Address", note: null }, items: [{ testCode: "SYN", testName: "Synthetic Test", specimenType: "Blood", preparationInstruction: null }], specimens: ["SPC-A", "SPC-B"].map((specimenCode) => ({ specimenCode, status: "LABELED", specimenType: "Blood", containerType: "Tube", targetVolumeMl: "3.5", requiresManualReview: false, linkedTests: [{ testCode: specimenCode, testName: "Synthetic Test" }] })), currentAttempt: { attemptNumber: 1, status: "ON_THE_WAY", startedAt: "2026-08-05T01:00:00Z", collectedAt: null, inTransitAt: null, failedAt: null }, timeline: [] };
}
function labSpecimen(): LabSpecimenDetail {
  return { specimenCode: "SPC-SYNTH", status: "IN_TRANSIT", version: 3, specimenType: "Blood", containerType: "Tube", targetVolumeMl: "3.5", collectedVolumeMl: "3.5", orderCode: "HL-SYNTH", subject: { displayName: "Synthetic Subject", dateOfBirth: "1990-01-01" }, linkedTests: [{ testCode: "SYN", testName: "Synthetic Test" }], collectedAt: "2026-08-05T02:00:00Z", inTransitAt: "2026-08-05T03:00:00Z", receivedAt: null, acceptedAt: null, rejectedAt: null, rejectionReason: null, rejectionNote: null, recollectionRequired: false, custodyTimeline: [] };
}
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } }); }

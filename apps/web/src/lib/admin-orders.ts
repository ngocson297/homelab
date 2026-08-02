import type { OrderSpecimen } from "@/lib/specimens";

export type OrderStatus = "PENDING_CONFIRMATION" | "CONFIRMED" | "COLLECTOR_ASSIGNED" | "COLLECTOR_ON_THE_WAY" | "COLLECTED" | "IN_TRANSIT" | "RECEIVED_AT_LAB" | "CANCELLED";
export type AdminOrderListItem = { orderCode: string; status: OrderStatus; statusLabel: string; contactName: string; maskedPhone: string; appointment: null | { scheduledDate: string; timeSlot: string; province: string; district: string; ward: string }; itemCount: number; totalAmount: string; version: number; createdAt: string; updatedAt: string };
export type AdminOrderDetail = { orderCode: string; status: OrderStatus; statusLabel: string; version: number; contact: { name: string; phone: string }; subject:null|{fullName:string;dateOfBirth:string;sex:string;relationshipToContact:string|null};collectionAttempts:{attemptNumber:number;collectorEmployeeCode:string;status:string;startedAt:string;collectedAt:string|null;inTransitAt:string|null;failedAt:string|null;failureReason:string|null}[];requiresCollectionAttention:boolean; requiresRecollection: boolean; specimens: OrderSpecimen[]; appointment: { scheduledDate: string; timeSlot: string; province: string; district: string; ward: string; addressLine: string; note: string | null; status: string }; items: { testCode: string; testName: string; specimenType: string; price: string }[]; subtotal: string; collectionFee: string; totalAmount: string; timeline: { status: OrderStatus; title: string; description: string | null; occurredAt: string }[]; currentCollector: null | { employeeCode: string; fullName: string; maskedPhone: string; operationalStatus: string }; createdAt: string; updatedAt: string };
export type AdminOrderList = { data: AdminOrderListItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export class AdminApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`${apiUrl}${path}`, { ...init, credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers }, signal: AbortSignal.timeout(10_000) }); }
  catch { throw new AdminApiError("Không thể kết nối tới hệ thống. Vui lòng thử lại.", 0); }
  if (!response.ok) {
    if (response.status === 401) throw new AdminApiError("Phiên đăng nhập đã hết hạn.", 401);
    if (response.status === 403) throw new AdminApiError("Bạn không có quyền thực hiện thao tác này.", 403);
    if (response.status === 404) throw new AdminApiError("Không tìm thấy đơn hàng.", 404);
    if (response.status === 409) {
      const body: unknown = await response.json().catch(() => null);
      const backendMessage = isRecord(body) && typeof body.message === "string" ? body.message : "";
      const message = backendMessage.includes("cập nhật bởi người khác")
        ? "Đơn hàng đã được cập nhật bởi người khác. Vui lòng tải lại dữ liệu."
        : "Thao tác không còn phù hợp với trạng thái hiện tại của đơn hàng.";
      throw new AdminApiError(message, 409);
    }
    if (response.status === 400) throw new AdminApiError("Thông tin gửi lên chưa hợp lệ.", 400);
    throw new AdminApiError("Hệ thống chưa thể xử lý yêu cầu.", response.status);
  }
  return response.json() as Promise<T>;
}
export const getAdminOrders = (query: string) => request<AdminOrderList>(`/admin/orders${query ? `?${query}` : ""}`);
export const getAdminOrder = (code: string) => request<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(code)}`);
export const confirmAdminOrder = (code: string, expectedVersion: number) => request<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(code)}/confirm`, { method: "PATCH", body: JSON.stringify({ expectedVersion }) });
export const cancelAdminOrder = (code: string, expectedVersion: number, reason: string) => request<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(code)}/cancel`, { method: "PATCH", body: JSON.stringify({ expectedVersion, reason }) });
export const rescheduleAdminOrder = (code: string, input: { expectedVersion: number; scheduledDate: string; timeSlot: string; reason: string }) => request<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(code)}/appointment`, { method: "PATCH", body: JSON.stringify(input) });
export const formatMoney = (value: string) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value));
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }

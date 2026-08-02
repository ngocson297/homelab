import type { CustodyTimelineEvent, LinkedSpecimenTest, SpecimenStatus } from "@/lib/specimens";

export type LabSpecimenDetail = {
  specimenCode: string;
  status: SpecimenStatus;
  version: number;
  specimenType: string;
  containerType: string;
  targetVolumeMl: string | null;
  collectedVolumeMl: string | null;
  orderCode: string;
  subject: { displayName: string; dateOfBirth: string };
  linkedTests: LinkedSpecimenTest[];
  collectedAt: string | null;
  inTransitAt: string | null;
  receivedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  rejectionNote: string | null;
  recollectionRequired: boolean;
  custodyTimeline?: CustodyTimelineEvent[];
};

export type LabSpecimenListItem = Pick<
  LabSpecimenDetail,
  "specimenCode" | "status" | "specimenType" | "containerType" | "orderCode" | "receivedAt" | "rejectedAt"
>;

export type LabSpecimenList = {
  data: LabSpecimenListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type LabSummary = {
  inTransit: number;
  receivedToday: number;
  rejectedToday: number;
  ordersRequiringRecollection: number;
};

export const rejectionReasons = [
  "HEMOLYZED",
  "CLOTTED",
  "INSUFFICIENT_VOLUME",
  "WRONG_CONTAINER",
  "UNLABELED",
  "LABEL_MISMATCH",
  "LEAKING",
  "TRANSPORT_TEMPERATURE_FAILED",
  "TRANSPORT_DELAYED",
  "DAMAGED",
  "OTHER",
] as const;

export type SpecimenRejectionReason = (typeof rejectionReasons)[number];

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class LabPortalError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new LabPortalError("Không thể kết nối tới hệ thống. Vui lòng thử lại.", 0);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new LabPortalError("Phiên đăng nhập đã hết hạn.", 401);
    if (response.status === 403) throw new LabPortalError("Tài khoản không có quyền truy cập cổng phòng xét nghiệm.", 403);
    if (response.status === 404) throw new LabPortalError("Không tìm thấy bệnh phẩm phù hợp.", 404);
    if (response.status === 409) throw new LabPortalError("Bệnh phẩm đã được cập nhật. Dữ liệu mới nhất đang được tải lại.", 409);
    if (response.status === 400) throw new LabPortalError(readMessage(body) ?? "Thông tin gửi lên chưa hợp lệ.", 400);
    throw new LabPortalError("Hệ thống chưa thể xử lý yêu cầu.", response.status);
  }
  return body as T;
}

export const getLabSummary = () => request<LabSummary>("/lab/specimens/summary");
export const getLabSpecimens = (query = "") =>
  request<LabSpecimenList>(`/lab/specimens${query ? `?${query}` : ""}`);
export const scanLabSpecimen = (barcodeValue: string) =>
  request<LabSpecimenDetail>("/lab/specimens/scan", {
    method: "POST",
    body: JSON.stringify({ barcodeValue: barcodeValue.trim() }),
  });
export const getLabSpecimen = (specimenCode: string) =>
  request<LabSpecimenDetail>(`/lab/specimens/${encodeURIComponent(specimenCode)}`);
export const receiveLabSpecimen = (
  specimenCode: string,
  input: {
    expectedVersion: number;
    operationId: string;
    assessment: {
      labelLegible: boolean;
      containerIntact: boolean;
      transportConditionAcceptable: boolean;
      measuredTemperatureC?: number | null;
    };
  },
) =>
  request<LabSpecimenDetail>(`/lab/specimens/${encodeURIComponent(specimenCode)}/receive`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const acceptLabSpecimen = (specimenCode: string, expectedVersion: number, operationId: string) =>
  request<LabSpecimenDetail>(`/lab/specimens/${encodeURIComponent(specimenCode)}/accept`, {
    method: "PATCH",
    body: JSON.stringify({ expectedVersion, operationId }),
  });
export const rejectLabSpecimen = (
  specimenCode: string,
  input: {
    expectedVersion: number;
    operationId: string;
    reason: SpecimenRejectionReason;
    note?: string;
    recollectionRequired: boolean;
  },
) =>
  request<LabSpecimenDetail>(`/lab/specimens/${encodeURIComponent(specimenCode)}/reject`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

function readMessage(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("message" in value)) return null;
  return typeof value.message === "string" ? value.message : null;
}

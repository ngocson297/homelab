export type SpecimenStatus =
  | "PLANNED"
  | "LABELED"
  | "COLLECTED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export type LinkedSpecimenTest = { testCode: string; testName: string };

export type CustodyTimelineEvent = {
  eventType: string;
  title: string;
  actorType: "SYSTEM" | "ADMIN" | "COLLECTOR" | "LAB_STAFF";
  actorEmployeeCode: string | null;
  occurredAt: string;
};

export type OrderSpecimen = {
  specimenCode: string;
  status: SpecimenStatus;
  specimenType: string;
  containerType: string;
  targetVolumeMl: string | null;
  collectedVolumeMl?: string | null;
  requiresManualReview: boolean;
  collectedAt?: string | null;
  inTransitAt?: string | null;
  receivedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  recollectionRequired?: boolean;
  linkedTests: LinkedSpecimenTest[];
  custodyTimeline?: CustodyTimelineEvent[];
};

export type SpecimenPlanResponse = {
  orderCode: string;
  version: number;
  specimens: OrderSpecimen[];
};

export type SpecimenLabel = {
  specimenCode: string;
  barcodeValue: string;
  symbology: "CODE_128";
  specimenType: string;
  containerType: string;
  targetVolumeMl: string | null;
  labelCount: number;
};

export type SpecimenLabelsResponse = { orderCode: string; labels: SpecimenLabel[] };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class SpecimenApiError extends Error {
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
    throw new SpecimenApiError("Không thể kết nối tới hệ thống. Vui lòng thử lại.", 0);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new SpecimenApiError("Phiên đăng nhập đã hết hạn.", 401);
    if (response.status === 403) throw new SpecimenApiError("Bạn không có quyền thực hiện thao tác này.", 403);
    if (response.status === 404) throw new SpecimenApiError("Không tìm thấy dữ liệu bệnh phẩm.", 404);
    if (response.status === 409) throw new SpecimenApiError("Dữ liệu đã thay đổi hoặc thao tác không còn phù hợp. Vui lòng tải lại.", 409);
    if (response.status === 400) throw new SpecimenApiError(readMessage(body) ?? "Thông tin bệnh phẩm chưa hợp lệ.", 400);
    throw new SpecimenApiError("Hệ thống chưa thể xử lý yêu cầu.", response.status);
  }
  return body as T;
}

export const prepareSpecimens = (orderCode: string, expectedVersion: number, operationId: string) =>
  request<SpecimenPlanResponse>(`/admin/orders/${encodeURIComponent(orderCode)}/specimens/prepare`, {
    method: "POST",
    body: JSON.stringify({ expectedVersion, operationId }),
  });

export const getSpecimenLabels = (orderCode: string) =>
  request<SpecimenLabelsResponse>(`/admin/orders/${encodeURIComponent(orderCode)}/specimen-labels`);

export const recordLabelsPrinted = (
  orderCode: string,
  operationId: string,
  specimenCodes: string[],
  printCount = 1,
) =>
  request<{ orderCode: string; recorded: number; idempotent: boolean }>(
    `/admin/orders/${encodeURIComponent(orderCode)}/specimen-labels/printed`,
    { method: "POST", body: JSON.stringify({ operationId, specimenCodes, printCount }) },
  );

export function newOperationId(): string {
  return globalThis.crypto.randomUUID();
}

function readMessage(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("message" in value)) return null;
  const message = value.message;
  return typeof message === "string" ? message : null;
}

export type LabTestStatus = "ACTIVE" | "INACTIVE";

export type LabTest = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  specimenType: string;
  containerType: string;
  minimumVolumeMl: string | null;
  preparationInstruction: string | null;
  turnaroundTimeHours: number;
  homeCollectable: boolean;
  price: string;
  status: LabTestStatus;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedLabTests = {
  data: LabTest[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const apiUrl =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";
const requestTimeoutMs = 8_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isLabTest(value: unknown): value is LabTest {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.code === "string" &&
    typeof value.name === "string" &&
    isNullableString(value.description) &&
    typeof value.specimenType === "string" &&
    typeof value.containerType === "string" &&
    isNullableString(value.minimumVolumeMl) &&
    isNullableString(value.preparationInstruction) &&
    typeof value.turnaroundTimeHours === "number" &&
    typeof value.homeCollectable === "boolean" &&
    typeof value.price === "string" &&
    (value.status === "ACTIVE" || value.status === "INACTIVE") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isPaginatedLabTests(value: unknown): value is PaginatedLabTests {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) {
    return false;
  }

  return (
    value.data.every(isLabTest) &&
    typeof value.meta.page === "number" &&
    typeof value.meta.limit === "number" &&
    typeof value.meta.total === "number" &&
    typeof value.meta.totalPages === "number"
  );
}

async function fetchFromApi(path: string): Promise<Response> {
  return fetch(`${apiUrl}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
}

export async function getLabTests(filters: {
  search?: string;
  homeCollectable?: boolean;
  page?: number;
}): Promise<PaginatedLabTests> {
  const query = new URLSearchParams({
    page: String(filters.page ?? 1),
    limit: "12",
  });

  if (filters.search) query.set("search", filters.search);
  if (filters.homeCollectable !== undefined) {
    query.set("homeCollectable", String(filters.homeCollectable));
  }

  const response = await fetchFromApi(`/lab-tests?${query}`);

  if (!response.ok) {
    throw new Error("Không thể tải danh mục xét nghiệm");
  }

  const payload = (await response.json()) as unknown;
  if (!isPaginatedLabTests(payload)) {
    throw new Error("Phản hồi danh mục xét nghiệm không hợp lệ");
  }

  return payload;
}

export async function getLabTest(id: string): Promise<LabTest | null> {
  const response = await fetchFromApi(`/lab-tests/${encodeURIComponent(id)}`);

  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) {
    throw new Error("Không thể tải thông tin xét nghiệm");
  }

  const payload = (await response.json()) as unknown;
  if (!isLabTest(payload)) {
    throw new Error("Phản hồi thông tin xét nghiệm không hợp lệ");
  }

  return payload;
}

export function formatPrice(price: string): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

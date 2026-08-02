export type StaffProfile = { email: string; fullName: string; role: "ADMIN" | "LAB_STAFF" | "COLLECTOR" };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class StaffAuthError extends Error {
  constructor(message: string, readonly kind: "credentials" | "network" | "api") { super(message); }
}

export async function staffLogin(input: { email: string; password: string }): Promise<StaffProfile> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/auth/staff/login`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input), signal: AbortSignal.timeout(10_000),
    });
  } catch { throw new StaffAuthError("Không thể kết nối tới hệ thống. Vui lòng thử lại.", "network"); }
  if (!response.ok) {
    if (response.status === 401) throw new StaffAuthError("Thông tin đăng nhập không hợp lệ.", "credentials");
    if (response.status === 429) throw new StaffAuthError("Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.", "api");
    throw new StaffAuthError("Hệ thống chưa thể đăng nhập lúc này. Vui lòng thử lại.", "api");
  }
  const value: unknown = await response.json().catch(() => null);
  if (!isRecord(value) || !isStaff(value.user)) throw new StaffAuthError("Phản hồi đăng nhập không hợp lệ.", "api");
  return value.user;
}

export async function staffLogout(): Promise<void> {
  try {
    await fetch(`${apiUrl}/auth/staff/logout`, { method: "POST", credentials: "include", signal: AbortSignal.timeout(10_000) });
  } catch { throw new StaffAuthError("Không thể kết nối tới hệ thống. Vui lòng thử lại.", "network"); }
}

function isStaff(value: unknown): value is StaffProfile { return isRecord(value) && typeof value.email === "string" && typeof value.fullName === "string" && ["ADMIN", "LAB_STAFF", "COLLECTOR"].includes(String(value.role)); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }

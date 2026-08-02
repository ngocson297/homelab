import "server-only";
import type { StaffProfile } from "@/lib/staff-auth";

const apiUrl = process.env.API_URL ?? "http://localhost:3001";

export async function getStaffSession(cookieHeader: string): Promise<StaffProfile | null> {
  try {
    const response = await fetch(`${apiUrl}/auth/staff/me`, { headers: { cookie: cookieHeader }, cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    const value: unknown = await response.json();
    if (!isRecord(value) || !isStaff(value.user)) return null;
    return value.user;
  } catch { return null; }
}

function isStaff(value: unknown): value is StaffProfile { return isRecord(value) && typeof value.email === "string" && typeof value.fullName === "string" && ["ADMIN", "LAB_STAFF", "COLLECTOR"].includes(String(value.role)); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }

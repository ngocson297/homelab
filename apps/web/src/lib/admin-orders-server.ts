import "server-only";
const apiUrl = process.env.API_URL ?? "http://localhost:3001";
export async function getAdminSummary(cookieHeader: string): Promise<Record<string, number> | null> {
  try { const response = await fetch(`${apiUrl}/admin/orders/summary`, { headers: { cookie: cookieHeader }, cache: "no-store", signal: AbortSignal.timeout(8_000) }); if (!response.ok) return null; const body = await response.json() as { counts?: Record<string, number> }; return body.counts ?? null; } catch { return null; }
}

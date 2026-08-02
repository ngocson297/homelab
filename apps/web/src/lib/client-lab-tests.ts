import { isLabTest, type LabTest } from "@/lib/lab-tests";

export async function fetchLabTestForCart(id: string): Promise<LabTest | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const response = await fetch(`${apiUrl}/lab-tests/${encodeURIComponent(id)}`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error("Không thể kiểm tra xét nghiệm");
  const payload: unknown = await response.json();
  if (!isLabTest(payload)) throw new Error("Dữ liệu xét nghiệm không hợp lệ");
  return payload;
}

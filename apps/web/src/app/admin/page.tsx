import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getAdminSummary } from "@/lib/admin-orders-server";
import { getStaffSession } from "@/lib/staff-auth-server";
export default async function AdminPage() {
  const cookieHeader = (await cookies()).toString();
  const user = await getStaffSession(cookieHeader);
  if (!user || user.role !== "ADMIN") redirect("/admin/login");
  const summary = await getAdminSummary(cookieHeader);
  const cards = [["Đơn chờ xác nhận", summary?.PENDING_CONFIRMATION ?? 0], ["Đơn đã xác nhận", summary?.CONFIRMED ?? 0], ["Đơn đã hủy", summary?.CANCELLED ?? 0]] as const;
  return <AdminShell name={user.fullName}><h1 className="text-3xl font-bold">Tổng quan</h1><div className="mt-6 grid gap-4 sm:grid-cols-3">{cards.map(([label, count]) => <section key={label} className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold text-teal-800">{count}</p></section>)}</div></AdminShell>;
}

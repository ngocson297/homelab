import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { getStaffSession } from "@/lib/staff-auth-server";

export default async function AdminPage() {
  const user = await getStaffSession((await cookies()).toString());
  if (!user || user.role !== "ADMIN") redirect("/admin/login");
  return <main className="min-h-screen bg-slate-100 px-5 py-10 sm:px-8"><div className="mx-auto max-w-5xl"><header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm"><div><p className="text-sm font-bold uppercase tracking-wider text-teal-800">HomeLab Admin</p><h1 className="mt-1 text-2xl font-bold">Xin chào, {user.fullName}</h1><p className="mt-1 text-sm text-slate-600">Role: {user.role}</p></div><AdminLogoutButton /></header><section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="text-xl font-bold">Dashboard</h2><p className="mt-3 text-slate-600">Quản lý đơn hàng sẽ được triển khai trong ticket tiếp theo.</p></section></div></main>;
}

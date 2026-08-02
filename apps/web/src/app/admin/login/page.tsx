import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getStaffSession } from "@/lib/staff-auth-server";

export default async function AdminLoginPage() {
  const cookieHeader = (await cookies()).toString();
  if (cookieHeader && await getStaffSession(cookieHeader)) redirect("/admin");
  return <main className="grid min-h-screen place-items-center bg-slate-100 px-5 py-12"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-800">HomeLab Admin</p><h1 className="mt-2 text-3xl font-bold">Đăng nhập nhân viên</h1><p className="mt-3 text-sm leading-6 text-slate-600">Khu vực dành cho nhân viên được cấp quyền.</p><AdminLoginForm /></section></main>;
}

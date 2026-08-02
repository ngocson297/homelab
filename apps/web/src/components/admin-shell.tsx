import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin-logout-button";
export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-100"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="font-bold text-teal-800">HomeLab Admin</p><p className="text-sm text-slate-600">{name}</p></div><nav aria-label="Quản trị" className="flex items-center gap-4"><Link className="rounded px-2 py-1 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600" href="/admin">Tổng quan</Link><Link className="rounded px-2 py-1 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600" href="/admin/orders">Đơn hàng</Link><AdminLogoutButton /></nav></div></header><div className="mx-auto max-w-7xl px-5 py-8">{children}</div></main>;
}

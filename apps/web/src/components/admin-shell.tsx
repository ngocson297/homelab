import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin-logout-button";
export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const links = [["Tổng quan", "/admin"], ["Đơn hàng", "/admin/orders"], ["Nhân viên lấy mẫu", "/admin/collectors"]] as const;
  return <main className="min-h-screen bg-slate-100"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="font-bold text-teal-800">HomeLab Admin</p><p className="text-sm text-slate-600">{name}</p></div><nav aria-label="Quản trị" className="flex flex-wrap items-center gap-3">{links.map(([label, href]) => <Link key={href} className="rounded px-2 py-1 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600" href={href}>{label}</Link>)}<AdminLogoutButton /></nav></div></header><div className="mx-auto max-w-7xl px-5 py-8">{children}</div></main>;
}

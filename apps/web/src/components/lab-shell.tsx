import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin-logout-button";

export function LabShell({ name, children }: { name: string; children: React.ReactNode }) {
  const links = [
    ["Tổng quan", "/lab"],
    ["Tiếp nhận mẫu", "/lab/intake"],
    ["Mẫu đã tiếp nhận", "/lab?status=RECEIVED"],
    ["Mẫu bị từ chối", "/lab?status=REJECTED"],
    ["Tài khoản", "/lab"],
  ] as const;
  return <main className="min-h-screen bg-slate-100">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"><div><strong className="text-teal-900">HomeLab Lab</strong><p className="text-sm text-slate-600">{name}</p></div><nav aria-label="Cổng phòng xét nghiệm" className="flex flex-wrap items-center gap-2">{links.map(([label, href]) => <Link key={`${label}-${href}`} href={href} className="rounded-lg px-2 py-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">{label}</Link>)}<AdminLogoutButton redirectTo="/lab/login" /></nav></div></header>
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">{children}</div>
  </main>;
}

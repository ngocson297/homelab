import Link from "next/link";

export default function TestCatalogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#f4f8f7] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="HomeLab - Trang chủ">
            <span className="grid size-10 place-items-center rounded-xl bg-teal-700 text-lg font-bold text-white">
              H
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight">HomeLab</span>
              <span className="block text-xs text-slate-500">Chăm sóc tại nhà</span>
            </span>
          </Link>
          <span className="hidden rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-900 sm:block">
            Danh mục xét nghiệm
          </span>
        </div>
      </header>
      {children}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-7 text-sm leading-6 text-slate-600 sm:px-8">
          Thông tin trên trang chỉ mô tả dịch vụ xét nghiệm, không thay thế tư vấn chuyên môn y tế.
        </div>
      </footer>
    </div>
  );
}

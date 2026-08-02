import { SiteHeader } from "@/components/site-header";

export default function TestCatalogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#f4f8f7] text-slate-900">
      <SiteHeader />
      {children}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-7 text-sm leading-6 text-slate-600 sm:px-8">
          Thông tin trên trang chỉ mô tả dịch vụ xét nghiệm, không thay thế tư vấn chuyên môn y tế.
        </div>
      </footer>
    </div>
  );
}

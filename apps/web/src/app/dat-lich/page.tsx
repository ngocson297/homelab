"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useCart } from "@/components/cart-provider";

export default function BookingPlaceholderPage() {
  const { items, hydrated } = useCart();
  return (
    <div className="min-h-screen bg-[#f4f8f7] text-slate-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Đặt lịch</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Bước đặt lịch sẽ được bổ sung sau</h1>
          <p className="mt-4 leading-7 text-slate-600">
            {hydrated ? `Bạn đã chọn ${items.length} xét nghiệm.` : "Đang tải giỏ xét nghiệm…"} Ticket hiện tại chưa tạo order và chưa thu thập thông tin cá nhân.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/gio-xet-nghiem" className="inline-flex min-h-12 items-center rounded-xl bg-slate-900 px-5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">Quay lại giỏ</Link>
            <Link href="/xet-nghiem" className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 px-5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800">Xem danh mục</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

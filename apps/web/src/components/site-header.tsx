"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export function SiteHeader() {
  const { items, hydrated } = useCart();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800" aria-label="HomeLab - Trang chủ">
          <span className="grid size-10 place-items-center rounded-xl bg-teal-700 text-lg font-bold text-white">H</span>
          <span><span className="block text-lg font-bold tracking-tight">HomeLab</span><span className="hidden text-xs text-slate-500 sm:block">Chăm sóc tại nhà</span></span>
        </Link>
        <Link href="/gio-xet-nghiem" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-800 hover:border-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800 focus-visible:ring-offset-2" aria-label={`Giỏ xét nghiệm, ${hydrated ? items.length : 0} xét nghiệm`}>
          <span aria-hidden="true">Giỏ</span>
          <span className="grid min-w-6 place-items-center rounded-full bg-teal-800 px-1.5 text-xs leading-6 text-white" aria-hidden="true">{hydrated ? items.length : "…"}</span>
        </Link>
      </div>
    </header>
  );
}

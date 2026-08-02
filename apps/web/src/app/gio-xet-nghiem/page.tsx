"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useCart } from "@/components/cart-provider";
import { calculateCartTotal, labTestToCartItem } from "@/lib/cart-state";
import { fetchLabTestForCart } from "@/lib/client-lab-tests";
import { formatPrice } from "@/lib/lab-tests";

export default function CartPage() {
  const { items, hydrated, remove, clear, reconcile } = useCart();
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState(false);

  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    let cancelled = false;
    Promise.all(
      items.map(async (item) => {
        const test = await fetchLabTestForCart(item.id);
        return test
          ? labTestToCartItem(test)
          : { ...item, available: false };
      }),
    )
      .then((freshItems) => {
        if (!cancelled) freshItems.forEach(reconcile);
      })
      .catch(() => {
        if (!cancelled) setCheckError(true);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
    // Revalidate once after localStorage hydration; reconcile itself updates items.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const availableItems = items.filter((item) => item.available);
  const total = calculateCartTotal(items);

  return (
    <div className="min-h-screen bg-[#f4f8f7] text-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Lab Test Cart</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Giỏ xét nghiệm</h1></div>
          {hydrated && items.length > 0 && <button type="button" onClick={clear} aria-label="Xóa toàn bộ giỏ xét nghiệm" className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800">Xóa toàn bộ</button>}
        </div>

        {!hydrated ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8" role="status">Đang tải giỏ xét nghiệm…</div>
        ) : items.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <h2 className="text-xl font-bold">Giỏ xét nghiệm đang trống</h2>
            <p className="mt-2 text-sm text-slate-600">Chọn xét nghiệm từ danh mục để chuẩn bị đặt lịch.</p>
            <Link href="/xet-nghiem" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-slate-900 px-5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">Quay lại danh mục</Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_19rem]">
            <section className="space-y-4" aria-label="Các xét nghiệm trong giỏ">
              {checking && <p className="text-sm text-slate-600" role="status">Đang kiểm tra tình trạng và giá mới nhất…</p>}
              {checkError && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-slate-800" role="alert">Chưa thể kiểm tra lại dữ liệu từ hệ thống. Vui lòng thử lại sau.</p>}
              {items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div><span className="font-mono text-xs font-bold text-slate-600">{item.code}</span><h2 className="mt-1 text-lg font-bold">{item.name}</h2>{!item.available && <p className="mt-2 inline-flex rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-sm font-semibold text-slate-800">Không còn được cung cấp</p>}</div>
                    <button type="button" onClick={() => remove(item.id)} aria-label={`Xóa ${item.name} khỏi giỏ`} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800">Xóa</button>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Loại bệnh phẩm</dt><dd className="mt-1 font-medium">{item.specimenType}</dd></div><div><dt className="text-slate-500">Trả kết quả</dt><dd className="mt-1 font-medium">Khoảng {item.turnaroundTimeHours} giờ</dd></div><div><dt className="text-slate-500">Giá tham khảo</dt><dd className="mt-1 font-bold">{formatPrice(item.price)}</dd></div></dl>
                </article>
              ))}
            </section>
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-5">
              <h2 className="text-lg font-bold">Tóm tắt</h2>
              <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt>Tổng xét nghiệm</dt><dd className="font-bold">{availableItems.length}</dd></div><div className="flex justify-between gap-4 border-t border-slate-200 pt-4 text-base"><dt className="font-semibold">Tổng tiền</dt><dd className="font-bold">{formatPrice(total)}</dd></div></dl>
              <p className="mt-4 text-xs leading-5 text-slate-600">Giá trong giỏ chỉ để tham khảo. Backend phải tính lại giá từ danh mục hiện hành khi tạo order.</p>
              {availableItems.length === 0 || checking || checkError ? <span aria-disabled="true" className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-slate-200 px-4 text-center font-semibold text-slate-500">Tiếp tục đặt lịch</span> : <Link href="/dat-lich" className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-4 text-center font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">Tiếp tục đặt lịch</Link>}
              <Link href="/xet-nghiem" className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-center font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800">Quay lại danh mục</Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookingSteps } from "@/components/booking-steps";
import {
  LAST_ORDER_SESSION_KEY,
  useBookingResult,
} from "@/components/booking-result-provider";
import { toCompletedOrder } from "@/lib/booking";
import { formatPrice } from "@/lib/lab-tests";
import { getOrder, OrderApiError } from "@/lib/orders";

export function BookingSuccess() {
  const { completedOrder, saveCompletedOrder } = useBookingResult();
  const [loading, setLoading] = useState(!completedOrder);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (completedOrder) return;
    const orderCode = window.sessionStorage.getItem(LAST_ORDER_SESSION_KEY);
    if (!orderCode) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    let cancelled = false;
    getOrder(orderCode)
      .then((order) => {
        if (!cancelled) saveCompletedOrder(toCompletedOrder(order));
      })
      .catch(() => {
        if (!cancelled)
          setError("Chưa thể tải lại thông tin đơn. Vui lòng thử tra cứu lại.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [completedOrder, saveCompletedOrder]);

  async function refreshOrder() {
    if (!completedOrder || refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const order = await getOrder(completedOrder.orderCode);
      saveCompletedOrder(toCompletedOrder(order));
    } catch (requestError) {
      setError(
        requestError instanceof OrderApiError
          ? requestError.message
          : "Chưa thể tra cứu đơn lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <main className="mx-auto w-full max-w-4xl px-5 py-16"><div className="rounded-2xl border border-slate-200 bg-white p-8" role="status">Đang tải thông tin đơn…</div></main>;
  }

  if (!completedOrder) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
        <BookingSteps current={3} />
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">Không có đơn vừa tạo</h1>
          <p className="mt-3 text-slate-600">Thông tin xác nhận chỉ được lưu tạm trong phiên trình duyệt này.</p>
          <Link href="/gio-xet-nghiem" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-slate-900 px-5 font-semibold text-white">Quay lại giỏ xét nghiệm</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <BookingSteps current={3} />
      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-teal-50 p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-800">Đặt lịch thành công</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">HomeLab đã nhận yêu cầu của bạn</h1>
          <p className="mt-3 text-sm text-slate-700">Mã đơn</p>
          <p className="mt-1 break-all font-mono text-xl font-bold text-slate-950" aria-label={`Mã đơn ${completedOrder.orderCode}`}>{completedOrder.orderCode}</p>
        </header>

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_19rem]">
          <div>
            <h2 className="text-lg font-bold">Danh sách xét nghiệm</h2>
            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {completedOrder.items.map((item) => (
                <li key={item.labTestId} className="flex flex-wrap justify-between gap-3 p-4 text-sm">
                  <span><span className="block font-semibold">{item.testName}</span><span className="font-mono text-xs text-slate-500">{item.testCode} · {item.specimenType}</span></span>
                  <span className="font-bold">{formatPrice(item.price)}</span>
                </li>
              ))}
            </ul>

            <h2 className="mt-7 text-lg font-bold">Lịch lấy mẫu</h2>
            <dl className="mt-4 grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
              <div><dt className="text-sm text-slate-500">Ngày lấy mẫu</dt><dd className="mt-1 font-semibold">{formatAppointmentDate(completedOrder.scheduledDate)}</dd></div>
              <div><dt className="text-sm text-slate-500">Khung giờ</dt><dd className="mt-1 font-semibold">{completedOrder.timeSlot}</dd></div>
              <div><dt className="text-sm text-slate-500">Trạng thái đơn</dt><dd className="mt-1 font-semibold">{orderStatusLabel(completedOrder.status)}</dd></div>
            </dl>
          </div>

          <aside className="h-fit rounded-2xl bg-slate-50 p-5" aria-label="Tổng tiền đơn hàng">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt>Tạm tính</dt><dd className="font-semibold">{formatPrice(completedOrder.subtotal)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Phí lấy mẫu</dt><dd className="font-semibold">{formatPrice(completedOrder.collectionFee)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-slate-300 pt-4 text-base"><dt className="font-bold">Tổng cộng</dt><dd className="font-bold">{formatPrice(completedOrder.totalAmount)}</dd></div>
            </dl>
            {error && <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">{error}</p>}
            <button type="button" onClick={refreshOrder} disabled={refreshing} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:bg-slate-400">{refreshing ? "Đang tra cứu…" : "Tra cứu đơn"}</button>
            <Link href="/" className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800">Về trang chủ</Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

function formatAppointmentDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function orderStatusLabel(status: "DRAFT" | "CONFIRMED" | "CANCELLED"): string {
  if (status === "CONFIRMED") return "Đã xác nhận";
  if (status === "CANCELLED") return "Đã hủy";
  return "Bản nháp";
}

"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LAST_ORDER_SESSION_KEY } from "@/components/booking-result-provider";
import { formatPrice } from "@/lib/lab-tests";
import { lookupOrder, OrderApiError, type PublicOrderResponse } from "@/lib/orders";

type Errors = { orderCode?: string; contactPhone?: string };

export function OrderLookup() {
  const [orderCode, setOrderCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [result, setResult] = useState<PublicOrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedCode = window.sessionStorage.getItem(LAST_ORDER_SESSION_KEY);
    if (savedCode) queueMicrotask(() => setOrderCode(savedCode));
  }, []);
  useEffect(() => { if (error) alertRef.current?.focus(); }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const nextErrors: Errors = {};
    if (!orderCode.trim()) nextErrors.orderCode = "Vui lòng nhập mã đơn.";
    if (!contactPhone.trim()) nextErrors.contactPhone = "Vui lòng nhập số điện thoại.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    submitting.current = true;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await lookupOrder({ orderCode: orderCode.trim(), contactPhone: contactPhone.trim() }));
    } catch (requestError) {
      setError(requestError instanceof OrderApiError ? requestError.message : "Hệ thống chưa thể tra cứu đơn lúc này. Vui lòng thử lại.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-800">Theo dõi đơn hàng</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Tra cứu đơn xét nghiệm</h1>
      <p className="mt-3 max-w-2xl text-slate-600">Nhập mã đơn và số điện thoại đã dùng khi đặt lịch. Thông tin này không được đưa lên URL hoặc lưu trong trình duyệt.</p>
      <form onSubmit={submit} noValidate className="mt-7 grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-start">
        <Field id="lookup-order-code" label="Mã đơn" value={orderCode} error={errors.orderCode} onChange={setOrderCode} autoComplete="off" />
        <Field id="lookup-phone" label="Số điện thoại" value={contactPhone} error={errors.contactPhone} onChange={setContactPhone} inputMode="tel" autoComplete="tel" />
        <button disabled={loading} className="min-h-12 rounded-xl bg-slate-900 px-6 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-slate-400 md:mt-7">{loading ? "Đang tra cứu…" : "Tra cứu"}</button>
      </form>
      {error && <div ref={alertRef} tabIndex={-1} role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 outline-none focus:ring-2 focus:ring-red-700">{error}</div>}
      {loading && <div role="status" className="mt-8 min-h-40 animate-pulse rounded-2xl bg-slate-100 p-6">Đang tải thông tin đơn…</div>}
      {!loading && !error && !result && <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">Chưa có kết quả tra cứu. Hãy nhập đầy đủ thông tin ở trên.</div>}
    </section>
    {result && <OrderResult order={result} />}
  </main>;
}

function Field({ id, label, value, error, onChange, ...props }: { id: string; label: string; value: string; error?: string; onChange: (value: string) => void; inputMode?: "tel"; autoComplete?: string }) {
  const errorId = `${id}-error`;
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label><input {...props} id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20" />{error && <p id={errorId} className="mt-1.5 text-sm text-red-700">{error}</p>}</div>;
}

function OrderResult({ order }: { order: PublicOrderResponse }) {
  return <section aria-live="polite" className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-slate-500">Mã đơn</p><h2 className="mt-1 break-all font-mono text-xl font-bold">{order.orderCode}</h2></div><span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900">{order.statusLabel}</span></div>
      <dl className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2"><div><dt className="text-sm text-slate-500">Số điện thoại</dt><dd className="font-semibold">{order.contact.maskedPhone}</dd></div><div><dt className="text-sm text-slate-500">Ngày tạo</dt><dd className="font-semibold">{formatDateTime(order.createdAt)}</dd></div><div><dt className="text-sm text-slate-500">Lịch lấy mẫu</dt><dd className="font-semibold">{formatDate(order.appointment.scheduledDate)} · {order.appointment.timeSlot}</dd></div><div><dt className="text-sm text-slate-500">Khu vực</dt><dd className="font-semibold">{order.appointment.ward}, {order.appointment.district}, {order.appointment.province}</dd></div></dl>
      <h3 className="mt-7 text-lg font-bold">Danh sách xét nghiệm</h3><ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">{order.items.map((item) => <li key={item.testCode} className="flex flex-wrap justify-between gap-3 p-4"><span><span className="block font-semibold">{item.testName}</span><span className="text-sm text-slate-500">{item.testCode} · {item.specimenType}</span></span><strong>{formatPrice(item.price)}</strong></li>)}</ul>
      <dl className="mt-6 space-y-2 text-sm"><div className="flex justify-between"><dt>Tạm tính</dt><dd>{formatPrice(order.subtotal)}</dd></div><div className="flex justify-between"><dt>Phí lấy mẫu</dt><dd>{formatPrice(order.collectionFee)}</dd></div><div className="flex justify-between border-t pt-3 text-base font-bold"><dt>Tổng tiền</dt><dd>{formatPrice(order.totalAmount)}</dd></div></dl>
    </article>
    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Tiến trình đơn hàng</h2><ol className="mt-5 space-y-5" aria-label="Dòng thời gian trạng thái đơn">{order.timeline.map((entry, index) => <li key={`${entry.occurredAt}-${index}`} className="relative border-l-2 border-teal-600 pl-5"><span className="absolute -left-[7px] top-1 size-3 rounded-full bg-teal-700" aria-hidden="true" /><p className="font-bold">{entry.title}</p>{entry.description && <p className="mt-1 text-sm leading-6 text-slate-600">{entry.description}</p>}<time className="mt-1 block text-xs text-slate-500" dateTime={entry.occurredAt}>{formatDateTime(entry.occurredAt)}</time></li>)}</ol></aside>
  </section>;
}

function formatDate(value: string): string { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)); }

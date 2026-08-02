"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BookingSteps } from "@/components/booking-steps";
import { useBookingResult } from "@/components/booking-result-provider";
import { useCart } from "@/components/cart-provider";
import {
  EMPTY_BOOKING_FORM,
  TIME_SLOTS,
  localDateInputValue,
  toCompletedOrder,
  toCreateOrderInput,
  validateBookingForm,
  type BookingFormErrors,
  type BookingFormValues,
} from "@/lib/booking";
import { calculateCartTotal, labTestToCartItem } from "@/lib/cart-state";
import { fetchLabTestForCart } from "@/lib/client-lab-tests";
import { formatPrice } from "@/lib/lab-tests";
import { createOrder, OrderApiError } from "@/lib/orders";

export function BookingForm() {
  const router = useRouter();
  const { items, hydrated, clear, reconcile } = useCart();
  const { saveCompletedOrder } = useBookingResult();
  const [values, setValues] = useState<BookingFormValues>(EMPTY_BOOKING_FORM);
  const [errors, setErrors] = useState<BookingFormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [checkingCart, setCheckingCart] = useState(true);
  const [cartError, setCartError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subjectIsContact, setSubjectIsContact] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) {
      router.replace("/gio-xet-nghiem");
      return;
    }
    let cancelled = false;
    Promise.all(
      items.map(async (item) => {
        const test = await fetchLabTestForCart(item.id);
        return test ? labTestToCartItem(test) : { ...item, available: false };
      }),
    )
      .then((freshItems) => {
        if (!cancelled) freshItems.forEach(reconcile);
      })
      .catch(() => {
        if (!cancelled) setCartError(true);
      })
      .finally(() => {
        if (!cancelled) setCheckingCart(false);
      });
    return () => {
      cancelled = true;
    };
    // Revalidate once after hydration; reconcile updates cart items in context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const availableItems = items.filter((item) => item.available);
  const canSubmit =
    hydrated &&
    !checkingCart &&
    !cartError &&
    availableItems.length > 0 &&
    !submitting;

  function updateField(field: keyof BookingFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setApiError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || !canSubmit) return;
    const nextErrors = validateBookingForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    setApiError(null);
    try {
      const order = await createOrder(
        toCreateOrderInput(
          values,
          availableItems.map((item) => item.id),
        ),
      );
      saveCompletedOrder(toCompletedOrder(order));
      clear();
      router.push("/dat-lich/thanh-cong");
    } catch (error) {
      setApiError(
        error instanceof OrderApiError
          ? error.message
          : "Không thể tạo đơn lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <BookingStatus message="Đang kiểm tra giỏ xét nghiệm…" />;
  }
  if (items.length === 0) {
    return <BookingStatus message="Giỏ xét nghiệm đang trống. Đang quay lại giỏ…" />;
  }
  if (checkingCart) {
    return <BookingStatus message="Đang kiểm tra giỏ xét nghiệm…" />;
  }

  return (
    <main id="main-content" className="app-container py-8 sm:py-12">
      <BookingSteps current={2} />
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
            Đặt lịch lấy mẫu
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Thông tin liên hệ và lịch hẹn
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Thông tin này chỉ được gửi tới HomeLab khi bạn xác nhận đặt lịch.
          </p>

          {cartError && (
            <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm" role="alert">
              Chưa thể kiểm tra lại giỏ xét nghiệm. Vui lòng quay lại giỏ và thử lại.
            </p>
          )}
          {apiError && (
            <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900" role="alert" tabIndex={-1}>
              {apiError}
            </div>
          )}

          <form className="mt-7 space-y-7" onSubmit={handleSubmit} noValidate>
            <fieldset className="grid gap-5 sm:grid-cols-2" disabled={submitting}>
              <legend className="col-span-full text-lg font-bold">Thông tin liên hệ</legend>
              <TextField id="contactName" label="Họ và tên" autoComplete="name" value={values.contactName} error={errors.contactName} onChange={(value) => updateField("contactName", value)} />
              <TextField id="contactPhone" label="Số điện thoại" inputMode="tel" autoComplete="tel" value={values.contactPhone} error={errors.contactPhone} onChange={(value) => updateField("contactPhone", value)} />
            </fieldset>

            <fieldset className="grid gap-5 sm:grid-cols-2" disabled={submitting}>
              <legend className="col-span-full text-lg font-bold">Thông tin người được xét nghiệm</legend>
              <p className="col-span-full text-sm text-slate-600">Thông tin này được dùng để xác minh đúng người lấy mẫu và phục vụ khoảng tham chiếu xét nghiệm.</p>
              <label className="col-span-full flex items-center gap-2"><input type="checkbox" checked={subjectIsContact} onChange={(event) => { const checked = event.target.checked; setSubjectIsContact(checked); if (checked) updateField("subjectFullName", values.contactName); }} />Người được xét nghiệm cũng là người liên hệ</label>
              <TextField id="subjectFullName" label="Họ và tên người được xét nghiệm" autoComplete="off" value={values.subjectFullName} error={errors.subjectFullName} onChange={(value) => updateField("subjectFullName", value)} />
              <TextField id="subjectDateOfBirth" label="Ngày sinh" type="date" value={values.subjectDateOfBirth} error={errors.subjectDateOfBirth} onChange={(value) => updateField("subjectDateOfBirth", value)} />
              <div><label htmlFor="subjectSex" className="block text-sm font-semibold">Giới tính dùng cho thông tin xét nghiệm</label><select id="subjectSex" value={values.subjectSex} onChange={(e) => updateField("subjectSex", e.target.value)} aria-invalid={Boolean(errors.subjectSex)} aria-describedby={errors.subjectSex ? "subjectSex-error" : undefined} className={inputClass(Boolean(errors.subjectSex))}><option value="">Chọn</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option><option value="UNKNOWN">Không xác định</option></select><FieldError id="subjectSex-error" message={errors.subjectSex} /></div>
              <TextField id="relationshipToContact" label="Mối quan hệ với người liên hệ (không bắt buộc)" autoComplete="off" value={values.relationshipToContact} error={errors.relationshipToContact} onChange={(value) => updateField("relationshipToContact", value)} />
            </fieldset>

            <fieldset className="grid gap-5 sm:grid-cols-2" disabled={submitting}>
              <legend className="col-span-full text-lg font-bold">Lịch lấy mẫu</legend>
              <TextField id="scheduledDate" label="Ngày lấy mẫu" type="date" min={localDateInputValue(new Date())} value={values.scheduledDate} error={errors.scheduledDate} onChange={(value) => updateField("scheduledDate", value)} />
              <SelectField id="timeSlot" label="Khung giờ" value={values.timeSlot} error={errors.timeSlot} onChange={(value) => updateField("timeSlot", value)} />
            </fieldset>

            <fieldset className="grid gap-5 sm:grid-cols-2" disabled={submitting}>
              <legend className="col-span-full text-lg font-bold">Địa chỉ lấy mẫu</legend>
              <TextField id="province" label="Tỉnh / thành phố" autoComplete="address-level1" value={values.province} error={errors.province} onChange={(value) => updateField("province", value)} />
              <TextField id="district" label="Quận / huyện" autoComplete="address-level2" value={values.district} error={errors.district} onChange={(value) => updateField("district", value)} />
              <TextField id="ward" label="Phường / xã" autoComplete="address-level3" value={values.ward} error={errors.ward} onChange={(value) => updateField("ward", value)} />
              <TextField id="addressLine" label="Địa chỉ cụ thể" autoComplete="street-address" value={values.addressLine} error={errors.addressLine} onChange={(value) => updateField("addressLine", value)} />
              <div className="sm:col-span-2">
                <label htmlFor="note" className="block text-sm font-semibold">Ghi chú <span className="font-normal text-slate-500">(không bắt buộc)</span></label>
                <textarea id="note" maxLength={500} rows={4} value={values.note} onChange={(event) => updateField("note", event.target.value)} aria-invalid={Boolean(errors.note)} aria-describedby={errors.note ? "note-error" : "note-help"} className={inputClass(Boolean(errors.note))} />
                <p id="note-help" className="mt-1 text-xs text-slate-500">Tối đa 500 ký tự. Không nhập thông tin y khoa nhạy cảm.</p>
                <FieldError id="note-error" message={errors.note} />
              </div>
            </fieldset>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
              <Link href="/gio-xet-nghiem" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800">Quay lại giỏ</Link>
              <button type="submit" disabled={!canSubmit} aria-describedby="submit-help" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-6 font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300">
                {submitting ? "Đang tạo đơn…" : "Xác nhận đặt lịch"}
              </button>
            </div>
            <p id="submit-help" className="text-xs text-slate-500">Mỗi lần bấm xác nhận chỉ gửi một yêu cầu tạo đơn.</p>
          </form>
        </section>

        <OrderSummary items={availableItems} />
      </div>
    </main>
  );
}

function OrderSummary({ items }: { items: ReturnType<typeof useCart>["items"] }) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-5" aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="text-lg font-bold">Tóm tắt đơn</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 border-b border-slate-100 pb-3 text-sm">
            <span><span className="block font-semibold">{item.name}</span><span className="text-xs text-slate-500">{item.code}</span></span>
            <span className="whitespace-nowrap font-semibold">{formatPrice(item.price)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between gap-4 font-bold"><span>Tạm tính</span><span>{formatPrice(calculateCartTotal(items))}</span></div>
      <p className="mt-4 rounded-xl bg-teal-50 p-3 text-xs leading-5 text-teal-950">Giá và điều kiện xét nghiệm sẽ được xác nhận lại bởi hệ thống.</p>
      <p className="mt-2 text-xs text-slate-500">Phí lấy mẫu và tổng tiền chính thức sẽ hiển thị sau khi backend tạo đơn.</p>
    </aside>
  );
}

function TextField({ id, label, value, error, onChange, ...props }: { id: keyof BookingFormValues; label: string; value: string; error?: string; onChange: (value: string) => void } & Pick<React.InputHTMLAttributes<HTMLInputElement>, "type" | "min" | "autoComplete" | "inputMode">) {
  const errorId = `${id}-error`;
  return <div><label htmlFor={id} className="block text-sm font-semibold">{label}</label><input {...props} id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className={inputClass(Boolean(error))} /><FieldError id={errorId} message={error} /></div>;
}

function SelectField({ id, label, value, error, onChange }: { id: "timeSlot"; label: string; value: string; error?: string; onChange: (value: string) => void }) {
  const errorId = `${id}-error`;
  return <div><label htmlFor={id} className="block text-sm font-semibold">{label}</label><select id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className={inputClass(Boolean(error))}><option value="">Chọn khung giờ</option>{TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select><FieldError id={errorId} message={error} /></div>;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-1 text-sm text-red-700">{message}</p> : null;
}

function inputClass(hasError: boolean): string {
  return `mt-2 min-h-12 w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:ring-2 ${hasError ? "border-red-500 focus:border-red-600 focus:ring-red-200" : "border-slate-300 focus:border-teal-700 focus:ring-teal-700/20"}`;
}

function BookingStatus({ message }: { message: string }) {
  return <main id="main-content" className="app-container max-w-3xl py-16"><div className="rounded-2xl border border-slate-200 bg-white p-8" role="status">{message}</div></main>;
}

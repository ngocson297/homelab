"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LAST_ORDER_SESSION_KEY } from "@/components/booking-result-provider";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatusBadge,
  Timeline,
  FieldError,
  inputClass,
} from "@/components/ui";
import { formatPrice } from "@/lib/lab-tests";
import {
  lookupOrder,
  OrderApiError,
  type PublicOrderResponse,
} from "@/lib/orders";

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

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const nextErrors: Errors = {};
    if (!orderCode.trim()) nextErrors.orderCode = "Vui lòng nhập mã đơn.";
    if (!contactPhone.trim())
      nextErrors.contactPhone = "Vui lòng nhập số điện thoại.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    submitting.current = true;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await lookupOrder({
          orderCode: orderCode.trim(),
          contactPhone: contactPhone.trim(),
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof OrderApiError
          ? requestError.message
          : "Hệ thống chưa thể tra cứu đơn lúc này. Vui lòng thử lại.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="app-container py-10 sm:py-14">
      <Card className="p-6 sm:p-8">
        <PageHeader
          eyebrow="Theo dõi đơn hàng"
          title="Tra cứu đơn xét nghiệm"
          description="Nhập mã đơn và số điện thoại đã dùng khi đặt lịch. Số điện thoại không được đưa lên URL hoặc lưu vào localStorage."
        />
        <form
          onSubmit={submit}
          noValidate
          className="mt-7 grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-start"
        >
          <Field
            id="lookup-order-code"
            label="Mã đơn"
            value={orderCode}
            error={errors.orderCode}
            onChange={setOrderCode}
            autoComplete="off"
          />
          <Field
            id="lookup-phone"
            label="Số điện thoại"
            value={contactPhone}
            error={errors.contactPhone}
            onChange={setContactPhone}
            inputMode="tel"
            autoComplete="tel"
          />
          <Button
            type="submit"
            disabled={loading}
            variant="secondary"
            className="md:mt-7"
          >
            {loading ? "Đang tra cứu…" : "Tra cứu"}
          </Button>
        </form>
        {error && (
          <div ref={alertRef} tabIndex={-1} className="mt-6 outline-none">
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          </div>
        )}
        {loading && (
          <div className="mt-8 min-h-40 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-6">
            <div className="skeleton h-4 w-40 rounded-full" />
            <div className="skeleton mt-4 h-16 rounded-xl" />
            <span className="sr-only">Đang tải thông tin đơn</span>
          </div>
        )}
        {!loading && !error && !result && (
          <div className="mt-8">
            <p className="sr-only">
              Chưa có kết quả tra cứu. Hãy nhập đầy đủ thông tin ở trên.
            </p>
            <EmptyState
              title="Chưa có kết quả tra cứu"
              description="Hãy nhập đầy đủ thông tin ở trên."
            />
          </div>
        )}
      </Card>
      {result && <OrderResult order={result} />}
    </main>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  ...props
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  inputMode?: "tel";
  autoComplete?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold">
        {label}
      </label>
      <input
        {...props}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={inputClass(Boolean(error))}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function OrderResult({ order }: { order: PublicOrderResponse }) {
  return (
    <section aria-live="polite" className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card as="article" className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Mã đơn</p>
            <h2 className="mt-1 break-all font-mono text-xl font-bold">
              {order.orderCode}
            </h2>
          </div>
          <StatusBadge tone={statusTone(order.statusLabel)}>
            {order.statusLabel}
          </StatusBadge>
        </div>
        <dl className="mt-6 grid gap-4 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-5 sm:grid-cols-2">
          <Info label="Số điện thoại" value={order.contact.maskedPhone} />
          <Info label="Ngày tạo" value={formatDateTime(order.createdAt)} />
          <Info
            label="Lịch lấy mẫu"
            value={`${formatDate(order.appointment.scheduledDate)} · ${order.appointment.timeSlot}`}
          />
          <Info
            label="Khu vực"
            value={`${order.appointment.ward}, ${order.appointment.district}, ${order.appointment.province}`}
          />
        </dl>
        <h3 className="mt-7 text-lg font-bold">Danh sách xét nghiệm</h3>
        <ul className="mt-3 divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)]">
          {order.items.map((item) => (
            <li
              key={item.testCode}
              className="flex flex-wrap justify-between gap-3 p-4"
            >
              <span>
                <span className="block font-semibold">{item.testName}</span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {item.testCode} · {item.specimenType}
                </span>
              </span>
              <strong>{formatPrice(item.price)}</strong>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Tạm tính</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Phí lấy mẫu</dt>
            <dd>{formatPrice(order.collectionFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-3 text-base font-bold">
            <dt>Tổng tiền</dt>
            <dd>{formatPrice(order.totalAmount)}</dd>
          </div>
        </dl>
      </Card>
      <Card as="aside" className="p-6">
        <h2 className="text-lg font-bold">Tiến trình đơn hàng</h2>
        <div className="mt-5">
          <Timeline
            ariaLabel="Dòng thời gian trạng thái đơn"
            items={order.timeline.map((entry) => ({
              title: entry.title,
              description: entry.description,
              time: formatDateTime(entry.occurredAt),
            }))}
          />
        </div>
      </Card>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-[var(--text-muted)]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function statusTone(label: string): "neutral" | "info" | "success" | "warning" | "danger" {
  const value = label.toLowerCase();
  if (value.includes("hủy") || value.includes("từ chối")) return "danger";
  if (value.includes("hoàn tất") || value.includes("đã nhận")) return "success";
  if (value.includes("chờ") || value.includes("cần")) return "warning";
  if (value.includes("đang") || value.includes("xác nhận")) return "info";
  return "neutral";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

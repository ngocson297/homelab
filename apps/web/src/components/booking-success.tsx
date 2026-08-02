"use client";

import Link from "next/link";
import { BookingSteps } from "@/components/booking-steps";
import { useBookingResult } from "@/components/booking-result-provider";
import {
  Alert,
  ButtonLink,
  Card,
  StatusBadge,
} from "@/components/ui";
import { formatPrice } from "@/lib/lab-tests";
import type { CompletedOrder } from "@/lib/booking";

export function BookingSuccess() {
  const { completedOrder } = useBookingResult();
  if (!completedOrder) {
    return (
      <main id="main-content" className="app-container py-12">
        <BookingSteps current={3} />
        <Card className="mt-8 p-8 text-center">
          <h1 className="text-2xl font-bold">Không có đơn vừa tạo</h1>
          <p className="mx-auto mt-3 max-w-lg text-[var(--text-secondary)]">
            Hãy dùng mã đơn bạn đã lưu và số điện thoại đặt lịch để tra cứu.
          </p>
          <ButtonLink href="/tra-cuu-don-hang" className="mt-6">
            Tra cứu đơn hàng
          </ButtonLink>
        </Card>
      </main>
    );
  }

  return (
    <main id="main-content" className="app-container py-8 sm:py-12">
      <BookingSteps current={3} />
      <Card className="mt-8 overflow-hidden">
        <header className="border-b border-[var(--border)] bg-[var(--primary-50)] p-6 sm:p-8">
          <StatusBadge tone="success">Đặt lịch thành công</StatusBadge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            HomeLab đã nhận yêu cầu của bạn
          </h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Mã đơn</p>
          <p
            className="mt-1 break-all font-mono text-2xl font-bold"
            aria-label={`Mã đơn ${completedOrder.orderCode}`}
          >
            {completedOrder.orderCode}
          </p>
        </header>

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_20rem]">
          <div>
            <Alert tone="info">
              Hãy lưu mã đơn để tra cứu trạng thái. Trang công khai chỉ hiển thị
              thông tin đã được giới hạn.
            </Alert>
            <h2 className="mt-7 text-lg font-bold">Danh sách xét nghiệm</h2>
            <ul className="mt-4 divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)]">
              {completedOrder.items.map((item) => (
                <li
                  key={item.labTestId}
                  className="flex flex-wrap justify-between gap-3 p-4 text-sm"
                >
                  <span>
                    <span className="block font-semibold">{item.testName}</span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {item.testCode} · {item.specimenType}
                    </span>
                  </span>
                  <span className="font-bold">{formatPrice(item.price)}</span>
                </li>
              ))}
            </ul>

            <h2 className="mt-7 text-lg font-bold">Lịch lấy mẫu</h2>
            <dl className="mt-4 grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4 sm:grid-cols-2">
              <Info label="Ngày lấy mẫu" value={formatDate(completedOrder.scheduledDate)} />
              <Info label="Khung giờ" value={completedOrder.timeSlot} />
              <Info
                label="Trạng thái đơn"
                value={statusLabel(completedOrder.status)}
              />
            </dl>
          </div>

          <aside
            className="h-fit rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-5"
            aria-label="Tổng tiền đơn hàng"
          >
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Tạm tính</dt>
                <dd className="font-semibold">
                  {formatPrice(completedOrder.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Phí lấy mẫu</dt>
                <dd className="font-semibold">
                  {formatPrice(completedOrder.collectionFee)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-[var(--border-strong)] pt-4 text-base">
                <dt className="font-bold">Tổng cộng</dt>
                <dd className="font-bold">
                  {formatPrice(completedOrder.totalAmount)}
                </dd>
              </div>
            </dl>
            <ButtonLink href="/tra-cuu-don-hang" className="mt-5 w-full">
              Tra cứu đơn hàng
            </ButtonLink>
            <Link
              href="/"
              className="focus-ring mt-3 flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 font-semibold"
            >
              Về trang chủ
            </Link>
          </aside>
        </div>
      </Card>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function statusLabel(status: CompletedOrder["status"]): string {
  if (status === "CONFIRMED") return "Đã xác nhận";
  if (status === "COLLECTOR_ASSIGNED") return "Đã phân công";
  if (status === "COLLECTOR_ON_THE_WAY") return "Đang di chuyển";
  if (status === "COLLECTED") return "Đã lấy mẫu";
  if (status === "IN_TRANSIT") return "Đang vận chuyển";
  if (status === "RECEIVED_AT_LAB")
    return "Đã tiếp nhận tại phòng xét nghiệm";
  if (status === "CANCELLED") return "Đã hủy";
  return "Chờ xác nhận";
}

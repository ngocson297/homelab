"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  AdminOrderList,
  formatMoney,
  getAdminOrders,
} from "@/lib/admin-orders";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  StatusBadge,
  inputClass,
} from "@/components/ui";

export function AdminOrderListView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<AdminOrderList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const query = searchParams.toString();

  useEffect(() => {
    let active = true;
    // Fetch state is intentionally reset when the URL query changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    getAdminOrders(query)
      .then((value) => active && setResult(value))
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof AdminApiError && reason.status === 401) {
          router.replace("/admin/login");
        } else {
          setError(
            reason instanceof Error
              ? reason.message
              : "Không thể tải đơn hàng.",
          );
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [query, router, refreshNonce]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim()) params.set("search", search.trim());
      else params.delete("search");
      params.delete("page");
      if (params.toString() !== searchParams.toString()) {
        router.replace(`${pathname}?${params}`);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search, pathname, router, searchParams]);

  const setParam = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    if (name !== "page") params.delete("page");
    router.replace(`${pathname}?${params}`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Quản lý vận hành"
        title="Đơn hàng"
        description="Lọc, tìm kiếm và mở chi tiết đơn để xác nhận, hủy, đổi lịch hoặc xử lý phân công."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefreshNonce((value) => value + 1)}
          >
            Làm mới
          </Button>
        }
      />

      <Card className="mt-6 grid gap-4 p-4 md:grid-cols-4">
        <label className="text-sm font-bold">
          Tìm kiếm
          <input
            aria-label="Tìm kiếm đơn hàng"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClass(false)}
            placeholder="Mã đơn, tên hoặc điện thoại"
          />
        </label>
        <SelectFilter
          label="Trạng thái"
          value={searchParams.get("status") ?? ""}
          onChange={(value) => setParam("status", value)}
          options={[
            ["", "Tất cả"],
            ["PENDING_CONFIRMATION", "Chờ xác nhận"],
            ["CONFIRMED", "Đã xác nhận"],
            ["COLLECTOR_ASSIGNED", "Đã phân công"],
            ["COLLECTOR_ON_THE_WAY", "Đang di chuyển"],
            ["COLLECTED", "Đã lấy mẫu"],
            ["IN_TRANSIT", "Đang vận chuyển"],
            ["RECEIVED_AT_LAB", "Đã tới phòng xét nghiệm"],
            ["CANCELLED", "Đã hủy"],
          ]}
        />
        <DateFilter
          label="Lịch từ"
          value={searchParams.get("appointmentDateFrom")?.slice(0, 10) ?? ""}
          onChange={(value) =>
            setParam(
              "appointmentDateFrom",
              value ? `${value}T00:00:00+07:00` : "",
            )
          }
        />
        <DateFilter
          label="Lịch đến"
          value={searchParams.get("appointmentDateTo")?.slice(0, 10) ?? ""}
          onChange={(value) =>
            setParam(
              "appointmentDateTo",
              value ? `${value}T23:59:59+07:00` : "",
            )
          }
        />
        <DateFilter
          label="Tạo từ"
          value={searchParams.get("createdFrom")?.slice(0, 10) ?? ""}
          onChange={(value) =>
            setParam("createdFrom", value ? `${value}T00:00:00+07:00` : "")
          }
        />
        <DateFilter
          label="Tạo đến"
          value={searchParams.get("createdTo")?.slice(0, 10) ?? ""}
          onChange={(value) =>
            setParam("createdTo", value ? `${value}T23:59:59+07:00` : "")
          }
        />
        <SelectFilter
          label="Sắp xếp"
          value={searchParams.get("sortBy") ?? "createdAt"}
          onChange={(value) => setParam("sortBy", value)}
          options={[
            ["createdAt", "Ngày tạo"],
            ["scheduledDate", "Ngày lấy mẫu"],
            ["totalAmount", "Tổng tiền"],
          ]}
        />
        <SelectFilter
          label="Thứ tự"
          value={searchParams.get("sortOrder") ?? "desc"}
          onChange={(value) => setParam("sortOrder", value)}
          options={[
            ["desc", "Mới nhất / giảm dần"],
            ["asc", "Cũ nhất / tăng dần"],
          ]}
        />
        <div className="flex gap-2 md:col-span-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearch("");
              router.replace(pathname);
            }}
          >
            Đặt lại
          </Button>
        </div>
      </Card>

      <div aria-live="polite" className="mt-6">
        {loading && <LoadingState label="Đang tải đơn hàng" />}
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
        {!loading && !error && result?.data.length === 0 && (
          <EmptyState
            title="Không có đơn hàng phù hợp"
            description="Hãy thử bỏ bộ lọc hoặc tìm bằng mã đơn khác."
          />
        )}
      </div>

      {!loading && !error && result && result.data.length > 0 && (
        <>
          <div className="mt-6 hidden overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách đơn hàng</caption>
              <thead className="bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                <tr>
                  {[
                    "Mã đơn",
                    "Khách hàng",
                    "Điện thoại",
                    "Lịch lấy mẫu",
                    "Khu vực",
                    "Xét nghiệm",
                    "Bệnh phẩm",
                    "Tổng tiền",
                    "Trạng thái",
                    "Ngày tạo",
                    "",
                  ].map((header) => (
                    <th key={header} className="p-3 font-bold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.map((order) => (
                  <tr key={order.orderCode} className="border-t border-[var(--border)]">
                    <td className="p-3 font-mono font-bold">{order.orderCode}</td>
                    <td className="p-3">{order.contactName}</td>
                    <td className="p-3">{order.maskedPhone}</td>
                    <td className="p-3">
                      {order.appointment
                        ? `${date(order.appointment.scheduledDate)} · ${order.appointment.timeSlot}`
                        : "Chưa có lịch"}
                    </td>
                    <td className="p-3">
                      {order.appointment
                        ? `${order.appointment.district}, ${order.appointment.province}`
                        : "—"}
                    </td>
                    <td className="p-3">{order.itemCount}</td>
                    <td className="p-3">
                      <span>{order.specimenCount}</span>
                      {order.rejectedSpecimenCount > 0 && (
                        <StatusBadge tone="danger" className="ml-1">
                          {order.rejectedSpecimenCount} từ chối
                        </StatusBadge>
                      )}
                      {order.requiresRecollection && (
                        <div className="mt-1">
                          <StatusBadge tone="warning">Cần lấy lại</StatusBadge>
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-semibold">
                      {formatMoney(order.totalAmount)}
                    </td>
                    <td className="p-3">
                      <StatusBadge tone={statusTone(order.statusLabel)}>
                        {order.statusLabel}
                      </StatusBadge>
                    </td>
                    <td className="p-3">{date(order.createdAt)}</td>
                    <td className="p-3">
                      <Link
                        className="font-semibold text-[var(--primary-800)] underline decoration-sky-200 underline-offset-4"
                        href={`/admin/orders/${order.orderCode}`}
                      >
                        Xem chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 lg:hidden">
            {result.data.map((order) => (
              <Card key={order.orderCode} as="article" className="p-5">
                <div className="flex justify-between gap-3">
                  <strong className="font-mono">{order.orderCode}</strong>
                  <StatusBadge tone={statusTone(order.statusLabel)}>
                    {order.statusLabel}
                  </StatusBadge>
                </div>
                <p className="mt-3 font-semibold">{order.contactName}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {order.maskedPhone}
                </p>
                <p className="mt-3 text-sm">
                  {order.appointment
                    ? `${date(order.appointment.scheduledDate)} · ${order.appointment.timeSlot}`
                    : "Chưa có lịch"}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {order.itemCount} xét nghiệm · {order.specimenCount} bệnh phẩm
                  {order.rejectedSpecimenCount
                    ? ` · ${order.rejectedSpecimenCount} bị từ chối`
                    : ""}
                </p>
                {order.requiresRecollection && (
                  <div className="mt-2">
                    <StatusBadge tone="warning">
                      Cần lấy lại bệnh phẩm
                    </StatusBadge>
                  </div>
                )}
                <p className="mt-3 font-bold">{formatMoney(order.totalAmount)}</p>
                <Link
                  className="mt-3 inline-block font-semibold text-[var(--primary-800)] underline decoration-sky-200 underline-offset-4"
                  href={`/admin/orders/${order.orderCode}`}
                >
                  Xem chi tiết
                </Link>
              </Card>
            ))}
          </div>

          <nav
            aria-label="Phân trang"
            className="mt-6 flex items-center justify-between gap-3"
          >
            <Button
              type="button"
              variant="outline"
              disabled={result.pagination.page <= 1}
              onClick={() => setParam("page", String(result.pagination.page - 1))}
            >
              Trang trước
            </Button>
            <span className="text-sm text-[var(--text-secondary)]">
              Trang {result.pagination.page}/
              {Math.max(1, result.pagination.totalPages)}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={result.pagination.page >= result.pagination.totalPages}
              onClick={() => setParam("page", String(result.pagination.page + 1))}
            >
              Trang sau
            </Button>
          </nav>
        </>
      )}
    </>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass(false)}
      >
        {options.map(([optionValue, text]) => (
          <option key={`${label}-${optionValue}`} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass(false)}
      />
    </label>
  );
}

function statusTone(label: string): "neutral" | "info" | "success" | "warning" | "danger" {
  const value = label.toLowerCase();
  if (value.includes("hủy") || value.includes("từ chối")) return "danger";
  if (value.includes("hoàn tất") || value.includes("đã lấy") || value.includes("chấp nhận")) return "success";
  if (value.includes("chờ") || value.includes("cần")) return "warning";
  if (value.includes("đang") || value.includes("xác nhận") || value.includes("phân công")) return "info";
  return "neutral";
}

const date = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

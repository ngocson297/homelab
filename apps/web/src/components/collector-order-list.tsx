"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CollectorOrderList,
  getCollectorOrders,
} from "@/lib/collector-portal";
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

export function CollectorOrderListView() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [data, setData] = useState<CollectorOrderList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const set = (key: string, value: string) => {
    const query = new URLSearchParams(params);
    if (value) query.set(key, value);
    else query.delete(key);
    query.set("page", "1");
    router.replace(`${path}?${query}`);
  };

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    getCollectorOrders(params.toString())
      .then((value) => active && setData(value))
      .catch(() => active && setError("Không thể tải nhiệm vụ."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params, refresh]);

  return (
    <>
      <PageHeader
        eyebrow="Cổng lấy mẫu"
        title="Nhiệm vụ lấy mẫu"
        description="Danh sách ưu tiên thông tin cần thao tác khi di chuyển: lịch, khu vực, trạng thái và lối vào chi tiết."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Làm mới
          </Button>
        }
      />

      <Card className="mt-5 grid gap-4 p-4 sm:grid-cols-2">
        <label className="text-sm font-bold">
          Ngày
          <input
            type="date"
            value={params.get("date") ?? ""}
            onChange={(event) => set("date", event.target.value)}
            className={inputClass(false)}
          />
        </label>
        <label className="text-sm font-bold">
          Trạng thái
          <select
            value={params.get("status") ?? ""}
            onChange={(event) => set("status", event.target.value)}
            className={inputClass(false)}
          >
            <option value="">Tất cả</option>
            <option value="COLLECTOR_ASSIGNED">Đã phân công</option>
            <option value="COLLECTOR_ON_THE_WAY">Đang di chuyển</option>
            <option value="COLLECTED">Đã lấy mẫu</option>
            <option value="IN_TRANSIT">Đang vận chuyển</option>
          </select>
        </label>
      </Card>

      <div aria-live="polite" className="mt-5">
        {loading && <LoadingState label="Đang tải nhiệm vụ" />}
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
        {!loading && !error && data?.data.length === 0 && (
          <EmptyState
            title="Không có nhiệm vụ"
            description="Hiện chưa có nhiệm vụ phù hợp với bộ lọc đang chọn."
          />
        )}
      </div>

      <div className="mt-5 grid gap-4">
        {!loading &&
          !error &&
          data?.data.map((order) => (
            <Card key={order.orderCode} as="article" className="p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <strong className="font-mono text-lg">{order.orderCode}</strong>
                <StatusBadge tone={statusTone(order.statusLabel)}>
                  {order.statusLabel}
                </StatusBadge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Info
                  label="Lịch"
                  value={
                    order.appointment
                      ? `${new Date(order.appointment.scheduledDate).toLocaleDateString("vi-VN")} · ${order.appointment.timeSlot}`
                      : "Chưa có lịch"
                  }
                />
                <Info
                  label="Khu vực"
                  value={
                    order.appointment
                      ? `${order.appointment.ward}, ${order.appointment.district}`
                      : "Chưa có khu vực"
                  }
                />
                <Info
                  label="Người được xét nghiệm"
                  value={order.subject.displayName}
                />
              </div>
              <Link
                className="focus-ring mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary-800)] px-4 font-semibold text-white sm:w-auto"
                href={`/collector/orders/${order.orderCode}`}
              >
                Xem nhiệm vụ
              </Link>
            </Card>
          ))}
      </div>

      {data && (
        <nav
          aria-label="Phân trang"
          className="mt-5 flex items-center justify-between gap-3"
        >
          <Button
            type="button"
            variant="outline"
            disabled={data.pagination.page <= 1}
            onClick={() => set("page", String(data.pagination.page - 1))}
          >
            Trang trước
          </Button>
          <span className="text-sm text-[var(--text-secondary)]">
            {data.pagination.page}/{Math.max(1, data.pagination.totalPages)}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={data.pagination.page >= data.pagination.totalPages}
            onClick={() => set("page", String(data.pagination.page + 1))}
          >
            Trang sau
          </Button>
        </nav>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function statusTone(label: string): "neutral" | "info" | "success" | "warning" {
  const value = label.toLowerCase();
  if (value.includes("đã lấy") || value.includes("vận chuyển")) return "success";
  if (value.includes("đang") || value.includes("phân công")) return "info";
  if (value.includes("chờ")) return "warning";
  return "neutral";
}

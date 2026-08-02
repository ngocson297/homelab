"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookingSteps } from "@/components/booking-steps";
import { useCart } from "@/components/cart-provider";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
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
        return test ? labTestToCartItem(test) : { ...item, available: false };
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
    return () => {
      cancelled = true;
    };
    // Revalidate once after localStorage hydration; reconcile itself updates items.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const availableItems = items.filter((item) => item.available);
  const total = calculateCartTotal(items);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <SiteHeader />
      <main id="main-content" className="app-container py-8 sm:py-12">
        <BookingSteps current={1} />
        <div className="mt-8">
          <PageHeader
            eyebrow="Giỏ xét nghiệm"
            title="Kiểm tra danh sách trước khi đặt lịch"
            description="Giá cuối cùng được hệ thống xác nhận khi tạo đơn. Bạn có thể xóa xét nghiệm hoặc quay lại danh mục để chọn thêm."
            action={
              hydrated && items.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={clear}
                  aria-label="Xóa toàn bộ giỏ xét nghiệm"
                >
                  Xóa toàn bộ
                </Button>
              ) : null
            }
          />
        </div>

        {!hydrated ? (
          <div className="mt-8">
            <LoadingState label="Đang tải giỏ xét nghiệm" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Giỏ xét nghiệm đang trống"
              description="Chọn xét nghiệm từ danh mục để chuẩn bị đặt lịch lấy mẫu tại nhà."
              action={<ButtonLink href="/xet-nghiem">Quay lại danh mục</ButtonLink>}
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <section className="space-y-4" aria-label="Các xét nghiệm trong giỏ">
              {checking && (
                <Alert role="status">
                  Đang kiểm tra tình trạng và giá mới nhất trong danh mục.
                </Alert>
              )}
              {checkError && (
                <Alert tone="warning" role="alert">
                  Chưa thể kiểm tra lại dữ liệu từ hệ thống. Vui lòng thử lại
                  sau trước khi đặt lịch.
                </Alert>
              )}
              {items.map((item) => (
                <Card key={item.id} as="article" className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="font-mono text-xs font-bold text-[var(--text-muted)]">
                        {item.code}
                      </span>
                      <h2 className="mt-1 text-lg font-bold leading-7 text-[var(--text-primary)]">
                        {item.name}
                      </h2>
                      {!item.available && (
                        <div className="mt-2">
                          <StatusBadge tone="warning">
                            Không còn được cung cấp
                          </StatusBadge>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => remove(item.id)}
                      aria-label={`Xóa ${item.name} khỏi giỏ`}
                    >
                      Xóa
                    </Button>
                  </div>
                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[var(--text-muted)]">Loại bệnh phẩm</dt>
                      <dd className="mt-1 font-semibold">{item.specimenType}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Trả kết quả</dt>
                      <dd className="mt-1 font-semibold">
                        Khoảng {item.turnaroundTimeHours} giờ
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Giá tham khảo</dt>
                      <dd className="mt-1 font-bold">{formatPrice(item.price)}</dd>
                    </div>
                  </dl>
                </Card>
              ))}
            </section>

            <aside
              className="medical-panel h-fit p-5 lg:sticky lg:top-24"
              aria-labelledby="cart-summary-title"
            >
              <h2 id="cart-summary-title" className="text-lg font-bold">
                Tóm tắt
              </h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Tổng xét nghiệm</dt>
                  <dd className="font-bold">{availableItems.length}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-4 text-base">
                  <dt className="font-semibold">Tạm tính</dt>
                  <dd className="font-bold">{formatPrice(total)}</dd>
                </div>
              </dl>
              <Alert className="mt-4" tone="info">
                Giá cuối cùng được hệ thống xác nhận khi tạo đơn.
              </Alert>
              {availableItems.length === 0 || checking || checkError ? (
                <span
                  aria-disabled="true"
                  className="mt-5 flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-slate-200 px-4 text-center font-semibold text-slate-500"
                >
                  Tiếp tục đặt lịch
                </span>
              ) : (
                <ButtonLink href="/dat-lich" className="mt-5 w-full">
                  Tiếp tục đặt lịch
                </ButtonLink>
              )}
              <Link
                href="/xet-nghiem"
                className="focus-ring mt-3 flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-center font-semibold"
              >
                Quay lại danh mục
              </Link>
            </aside>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

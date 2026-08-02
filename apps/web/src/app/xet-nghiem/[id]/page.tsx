import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Alert, ButtonLink, Card, StatusBadge } from "@/components/ui";
import { formatPrice, getLabTest } from "@/lib/lab-tests";

export const metadata: Metadata = {
  title: "Chi tiết xét nghiệm | HomeLab",
};

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const test = await getLabTest(id);
  if (!test) notFound();

  return (
    <main id="main-content" className="app-container py-8 sm:py-12">
      <Link
        href="/xet-nghiem"
        className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[var(--primary-800)] hover:underline"
      >
        <span aria-hidden="true">←</span> Quay lại danh mục
      </Link>

      <Card as="article" className="mt-6 overflow-hidden">
        <div className="border-b border-[var(--border)] p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-[var(--surface-muted)] px-3 py-1.5 font-mono text-xs font-bold text-[var(--text-secondary)]">
              {test.code}
            </span>
            <StatusBadge tone={test.status === "ACTIVE" ? "success" : "neutral"}>
              {test.status === "ACTIVE" ? "Đang cung cấp" : "Tạm ngưng"}
            </StatusBadge>
            {test.homeCollectable && (
              <StatusBadge tone="success">Có thể lấy mẫu tại nhà</StatusBadge>
            )}
          </div>
          <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            {test.name}
          </h1>
          {test.description && (
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
              {test.description}
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_20rem]">
          <section className="p-6 sm:p-10" aria-labelledby="sample-heading">
            <h2 id="sample-heading" className="text-xl font-bold">
              Thông tin mẫu xét nghiệm
            </h2>
            <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
              <Info label="Loại bệnh phẩm" value={test.specimenType} />
              <Info label="Dụng cụ chứa mẫu" value={test.containerType} />
              <Info
                label="Thể tích tối thiểu"
                value={
                  test.minimumVolumeMl
                    ? `${test.minimumVolumeMl} ml`
                    : "Không yêu cầu"
                }
              />
              <Info
                label="Thời gian trả kết quả"
                value={`Khoảng ${test.turnaroundTimeHours} giờ`}
              />
            </dl>

            <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
              <h2 className="font-bold">Hướng dẫn chuẩn bị</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {test.preparationInstruction ??
                  "Không có hướng dẫn chuẩn bị đặc biệt cho xét nghiệm này."}
              </p>
            </div>
          </section>

          <aside className="border-t border-[var(--border)] bg-[var(--surface-muted)] p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-sm font-medium text-[var(--text-muted)]">
              Giá tham khảo
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              {formatPrice(test.price)}
            </p>
            <Alert className="mt-6" tone="info">
              Giá hiển thị dành cho dịch vụ trong danh mục và được xác nhận lại
              khi đặt lịch.
            </Alert>
            <div className="mt-6">
              <AddToCartButton test={test} />
            </div>
            <ButtonLink href="/xet-nghiem" variant="outline" className="mt-4 w-full">
              Xem xét nghiệm khác
            </ButtonLink>
          </aside>
        </div>
      </Card>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--border)] pb-5">
      <dt className="text-sm text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1.5 font-semibold">{value}</dd>
    </div>
  );
}

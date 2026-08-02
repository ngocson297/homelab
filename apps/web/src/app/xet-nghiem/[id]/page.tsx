import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/xet-nghiem" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-900 hover:underline">
        <span aria-hidden="true">←</span> Quay lại danh mục
      </Link>

      <article className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold text-slate-700">{test.code}</span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              {test.status === "ACTIVE" ? "Đang cung cấp" : "Tạm ngưng"}
            </span>
            {test.homeCollectable && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
                <span aria-hidden="true">⌂</span> Có thể lấy mẫu tại nhà
              </span>
            )}
          </div>
          <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">{test.name}</h1>
          {test.description && <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{test.description}</p>}
        </div>

        <div className="grid lg:grid-cols-[1fr_19rem]">
          <section className="p-6 sm:p-10" aria-labelledby="sample-heading">
            <h2 id="sample-heading" className="text-xl font-bold text-slate-950">Thông tin mẫu xét nghiệm</h2>
            <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
              <div className="border-b border-slate-100 pb-5"><dt className="text-sm text-slate-500">Loại mẫu</dt><dd className="mt-1.5 font-semibold text-slate-900">{test.specimenType}</dd></div>
              <div className="border-b border-slate-100 pb-5"><dt className="text-sm text-slate-500">Dụng cụ chứa mẫu</dt><dd className="mt-1.5 font-semibold text-slate-900">{test.containerType}</dd></div>
              <div className="border-b border-slate-100 pb-5"><dt className="text-sm text-slate-500">Thể tích tối thiểu</dt><dd className="mt-1.5 font-semibold text-slate-900">{test.minimumVolumeMl ? `${test.minimumVolumeMl} ml` : "Không yêu cầu"}</dd></div>
              <div className="border-b border-slate-100 pb-5"><dt className="text-sm text-slate-500">Thời gian trả kết quả</dt><dd className="mt-1.5 font-semibold text-slate-900">Khoảng {test.turnaroundTimeHours} giờ</dd></div>
            </dl>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-bold text-slate-950">Hướng dẫn chuẩn bị</h2>
              <p className="mt-2 text-sm leading-6 text-slate-650">
                {test.preparationInstruction ?? "Không có hướng dẫn chuẩn bị đặc biệt cho xét nghiệm này."}
              </p>
            </div>
          </section>

          <aside className="border-t border-slate-200 bg-slate-50 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-sm font-medium text-slate-500">Giá tham khảo</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{formatPrice(test.price)}</p>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
              Giá hiển thị dành cho dịch vụ trong danh mục và có thể được xác nhận lại khi đặt lịch.
            </div>
            <Link href="/xet-nghiem" className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 text-center font-semibold text-white transition hover:bg-slate-700">
              Xem xét nghiệm khác
            </Link>
          </aside>
        </div>
      </article>
    </main>
  );
}

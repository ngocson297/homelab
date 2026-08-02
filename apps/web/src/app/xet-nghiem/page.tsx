import type { Metadata } from "next";
import Link from "next/link";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { formatPrice, getLabTests } from "@/lib/lab-tests";

export const metadata: Metadata = {
  title: "Danh mục xét nghiệm | HomeLab",
  description: "Tra cứu danh mục xét nghiệm và thông tin lấy mẫu tại nhà.",
};

type CatalogSearchParams = Promise<{
  search?: string | string[];
  homeCollectable?: string | string[];
  page?: string | string[];
}>;

function singleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function pageHref(search: string, homeCollectable: boolean, page: number): string {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (homeCollectable) query.set("homeCollectable", "true");
  query.set("page", String(page));
  return `/xet-nghiem?${query}`;
}

export default async function TestCatalogPage({
  searchParams,
}: {
  searchParams: CatalogSearchParams;
}) {
  const params = await searchParams;
  const search = singleValue(params.search).trim();
  const homeCollectable = singleValue(params.homeCollectable) === "true";
  const parsedPage = Number.parseInt(singleValue(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const result = await getLabTests({
    search,
    homeCollectable: homeCollectable ? true : undefined,
    page,
  });

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
            Test Catalog
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Tìm xét nghiệm phù hợp với nhu cầu của bạn
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Tra cứu thông tin loại mẫu, thời gian trả kết quả dự kiến và khả năng lấy mẫu tại nhà.
          </p>

          <form className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:grid-cols-[1fr_auto_auto] sm:items-center" action="/xet-nghiem">
            <label className="relative block">
              <span className="sr-only">Tên xét nghiệm</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500">
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <path d="m16 16 4 4" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                name="search"
                defaultValue={search}
                placeholder="Tìm theo tên xét nghiệm"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
              />
            </label>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                name="homeCollectable"
                value="true"
                defaultChecked={homeCollectable}
                className="size-4 accent-teal-700"
              />
              Có thể lấy mẫu tại nhà
            </label>
            <button className="h-12 rounded-xl bg-slate-900 px-6 font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">
              Tìm kiếm
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Danh sách xét nghiệm</h2>
            <p className="mt-1 text-sm text-slate-600">Tìm thấy {result.meta.total} xét nghiệm</p>
          </div>
          {(search || homeCollectable) && (
            <Link href="/xet-nghiem" className="text-sm font-semibold text-teal-800 underline decoration-teal-300 underline-offset-4">
              Xóa bộ lọc
            </Link>
          )}
        </div>

        {result.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-xl" aria-hidden="true">⌕</div>
            <h2 className="mt-4 text-lg font-bold">Không tìm thấy xét nghiệm</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Hãy thử tên khác hoặc bỏ bộ lọc lấy mẫu tại nhà.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {result.data.map((test) => (
              <article key={test.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700">{test.code}</span>
                  {test.homeCollectable && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
                      <span aria-hidden="true">⌂</span> Lấy mẫu tại nhà
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-bold leading-6 text-slate-950">{test.name}</h3>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <dt className="text-slate-500">Loại mẫu</dt><dd className="text-right font-medium text-slate-800">{test.specimenType}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Trả kết quả</dt><dd className="text-right font-medium text-slate-800">Khoảng {test.turnaroundTimeHours} giờ</dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
                  <div><p className="text-xs text-slate-500">Giá tham khảo</p><p className="mt-1 text-lg font-bold text-slate-950">{formatPrice(test.price)}</p></div>
                  <div className="flex flex-wrap gap-2"><Link href={`/xet-nghiem/${test.id}`} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3.5 text-sm font-semibold text-slate-800 transition hover:border-teal-700 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800">Chi tiết</Link><AddToCartButton test={test} /></div>
                </div>
              </article>
            ))}
          </div>
        )}

        {result.meta.totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Phân trang">
            {result.meta.page > 1 ? <Link className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold" href={pageHref(search, homeCollectable, result.meta.page - 1)}>Trang trước</Link> : <span className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400">Trang trước</span>}
            <span className="text-sm text-slate-600">Trang {result.meta.page} / {result.meta.totalPages}</span>
            {result.meta.page < result.meta.totalPages ? <Link className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold" href={pageHref(search, homeCollectable, result.meta.page + 1)}>Trang sau</Link> : <span className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400">Trang sau</span>}
          </nav>
        )}
      </section>
    </main>
  );
}

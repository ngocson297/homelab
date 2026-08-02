import type { Metadata } from "next";
import Link from "next/link";
import { AddToCartButton } from "@/components/add-to-cart-button";
import {
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  StatusBadge,
  inputClass,
} from "@/components/ui";
import { formatPrice, getLabTests } from "@/lib/lab-tests";

export const metadata: Metadata = {
  title: "Danh mục xét nghiệm | HomeLab",
  description:
    "Tra cứu danh mục xét nghiệm và thông tin lấy mẫu tại nhà.",
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
    <main id="main-content">
      <section className="border-b border-[var(--border)] bg-white">
        <div className="app-container py-10 sm:py-14">
          <PageHeader
            eyebrow="Danh mục xét nghiệm"
            title="Tìm xét nghiệm phù hợp với nhu cầu của bạn"
            description="Tra cứu loại bệnh phẩm, thời gian trả kết quả dự kiến, khả năng lấy mẫu tại nhà và giá tham khảo trước khi thêm vào giỏ."
          />

          <form
            className="medical-panel mt-8 grid gap-4 p-4 md:grid-cols-[1fr_auto_auto] md:items-end"
            action="/xet-nghiem"
          >
            <label className="block">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Tên hoặc mã xét nghiệm
              </span>
              <input
                name="search"
                defaultValue={search}
                placeholder="Tìm theo tên xét nghiệm"
                className={inputClass(false)}
              />
            </label>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--text-primary)]">
              <input
                type="checkbox"
                name="homeCollectable"
                value="true"
                defaultChecked={homeCollectable}
                className="size-4 accent-[var(--primary-700)]"
              />
              Có thể lấy mẫu tại nhà
            </label>
            <button className="min-h-12 rounded-[var(--radius-control)] bg-[var(--primary-800)] px-6 font-semibold text-white transition hover:bg-[var(--primary-900)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-700)] focus:ring-offset-2">
              Tìm kiếm
            </button>
          </form>
        </div>
      </section>

      <section className="app-container py-9 sm:py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Danh sách xét nghiệm
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Tìm thấy {result.meta.total} xét nghiệm
            </p>
          </div>
          {(search || homeCollectable) && (
            <ButtonLink href="/xet-nghiem" variant="outline">
              Xóa bộ lọc
            </ButtonLink>
          )}
        </div>

        {result.data.length === 0 ? (
          <EmptyState
            title="Không tìm thấy xét nghiệm"
            description="Hãy thử tên khác hoặc bỏ bộ lọc lấy mẫu tại nhà."
            action={<ButtonLink href="/xet-nghiem">Xem tất cả xét nghiệm</ButtonLink>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.data.map((test) => (
              <Card key={test.id} as="article" className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-md bg-[var(--surface-muted)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--text-secondary)]">
                    {test.code}
                  </span>
                  {test.homeCollectable ? (
                    <StatusBadge tone="success">Lấy mẫu tại nhà</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">Tại cơ sở</StatusBadge>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-bold leading-7 text-[var(--text-primary)]">
                  {test.name}
                </h3>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-[var(--border)] pb-3">
                    <dt className="text-[var(--text-muted)]">Loại bệnh phẩm</dt>
                    <dd className="text-right font-semibold">{test.specimenType}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--text-muted)]">Trả kết quả</dt>
                    <dd className="text-right font-semibold">
                      Khoảng {test.turnaroundTimeHours} giờ
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Giá tham khảo
                    </p>
                    <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                      {formatPrice(test.price)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/xet-nghiem/${test.id}`}
                      className="focus-ring inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary-700)] hover:text-[var(--primary-800)]"
                    >
                      Chi tiết
                    </Link>
                    <AddToCartButton test={test} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {result.meta.totalPages > 1 && (
          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            aria-label="Phân trang"
          >
            {result.meta.page > 1 ? (
              <Link
                className="focus-ring rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-semibold"
                href={pageHref(search, homeCollectable, result.meta.page - 1)}
              >
                Trang trước
              </Link>
            ) : (
              <span className="rounded-[var(--radius-control)] border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)]">
                Trang trước
              </span>
            )}
            <span className="text-sm text-[var(--text-secondary)]">
              Trang {result.meta.page} / {result.meta.totalPages}
            </span>
            {result.meta.page < result.meta.totalPages ? (
              <Link
                className="focus-ring rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-semibold"
                href={pageHref(search, homeCollectable, result.meta.page + 1)}
              >
                Trang sau
              </Link>
            ) : (
              <span className="rounded-[var(--radius-control)] border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)]">
                Trang sau
              </span>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}

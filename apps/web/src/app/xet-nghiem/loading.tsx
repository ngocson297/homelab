export default function TestCatalogLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8" aria-busy="true" aria-label="Đang tải danh mục xét nghiệm">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-slate-200" />
      <div className="mt-8 h-20 animate-pulse rounded-2xl bg-white" />
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
      <p className="sr-only">Đang tải dữ liệu xét nghiệm...</p>
    </main>
  );
}

"use client";

export default function TestCatalogError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[65vh] w-full max-w-3xl items-center px-5 py-12 sm:px-8">
      <section className="w-full rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto grid size-12 place-items-center rounded-full border border-amber-300 bg-amber-50 text-xl" aria-hidden="true">!</div>
        <h1 className="mt-5 text-2xl font-bold text-slate-950">Chưa thể tải danh mục</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600">Kết nối đến hệ thống đang gián đoạn. Vui lòng thử lại sau ít phút.</p>
        <button onClick={() => unstable_retry()} className="mt-7 min-h-12 rounded-xl bg-slate-900 px-6 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">Thử lại</button>
      </section>
    </main>
  );
}

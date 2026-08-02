import Link from "next/link";

export default function TestNotFound() {
  return (
    <main className="mx-auto flex min-h-[65vh] w-full max-w-3xl items-center px-5 py-12 sm:px-8">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-xl" aria-hidden="true">?</div>
        <h1 className="mt-5 text-2xl font-bold text-slate-950">Không tìm thấy xét nghiệm</h1>
        <p className="mt-3 leading-7 text-slate-600">Xét nghiệm này không tồn tại hoặc hiện không còn trong danh mục.</p>
        <Link href="/xet-nghiem" className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-slate-900 px-6 font-semibold text-white">Về danh mục xét nghiệm</Link>
      </section>
    </main>
  );
}

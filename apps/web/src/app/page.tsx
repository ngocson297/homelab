export default function Home() {
  return (
    <main className="flex min-h-screen items-center bg-slate-50 px-6 py-20">
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm sm:p-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
          HomeLab
        </p>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          Đặt lịch lấy mẫu xét nghiệm tại nhà
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Nền tảng đang trong giai đoạn xây dựng nền móng kỹ thuật. Chức năng
          đặt lịch sẽ sớm được mở trong vertical slice tiếp theo.
        </p>
        <div className="mt-10 inline-flex rounded-full bg-teal-50 px-5 py-3 text-sm font-medium text-teal-800">
          Hệ thống nền tảng đã sẵn sàng
        </div>
      </section>
    </main>
  );
}

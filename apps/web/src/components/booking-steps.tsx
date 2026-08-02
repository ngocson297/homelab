const steps = ["Chọn xét nghiệm", "Thông tin lấy mẫu", "Xác nhận"];

export function BookingSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Tiến trình đặt lịch">
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((step, index) => {
          const number = index + 1;
          const active = number === current;
          const completed = number < current;
          return (
            <li
              key={step}
              aria-current={active ? "step" : undefined}
              className={`rounded-xl border px-3 py-3 text-center text-xs font-semibold sm:text-sm ${
                active
                  ? "border-teal-700 bg-teal-50 text-teal-900"
                  : completed
                    ? "border-slate-300 bg-white text-slate-800"
                    : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <span className="block text-[0.7rem] uppercase tracking-wide">
                Bước {number}
              </span>
              <span className="mt-1 block">{step}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const steps = ["Chọn xét nghiệm", "Thông tin lấy mẫu", "Xác nhận"];

export function BookingSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Tiến trình đặt lịch" className="medical-panel p-3">
      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => {
          const number = index + 1;
          const active = number === current;
          const completed = number < current;
          return (
            <li
              key={step}
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                active
                  ? "bg-[var(--primary-50)] text-[var(--primary-900)]"
                  : completed
                    ? "bg-emerald-50 text-emerald-900"
                    : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
              }`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-[var(--primary-800)] text-white"
                    : completed
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-[var(--text-muted)]"
                }`}
                aria-hidden="true"
              >
                {completed ? "✓" : number}
              </span>
              <span>
                <span className="block text-xs font-bold uppercase tracking-[0.12em]">
                  Bước {number}
                </span>
                <span className="mt-0.5 block font-semibold">{step}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

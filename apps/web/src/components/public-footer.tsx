import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-white">
      <div className="app-container grid gap-8 py-10 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <p className="text-lg font-bold text-[var(--primary-900)]">HomeLab</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
            Nền tảng đặt lịch lấy mẫu xét nghiệm tại nhà, tập trung vào quy
            trình rõ ràng, bảo mật thông tin và trải nghiệm dễ sử dụng.
          </p>
        </div>
        <nav aria-label="Liên kết hỗ trợ">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Hỗ trợ</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
            <li>
              <Link className="hover:text-[var(--primary-800)]" href="/xet-nghiem">
                Danh mục xét nghiệm
              </Link>
            </li>
            <li>
              <Link className="hover:text-[var(--primary-800)]" href="/tra-cuu-don-hang">
                Theo dõi đơn đã đặt
              </Link>
            </li>
            <li>
              <Link className="hover:text-[var(--primary-800)]" href="/gio-xet-nghiem">
                Giỏ xét nghiệm
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Khu vực phục vụ</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Khu vực lấy mẫu được xác nhận theo từng lịch hẹn. Không hiển thị
            giấy phép, chứng nhận hoặc địa chỉ khi chưa có dữ liệu cấu hình thật.
          </p>
        </div>
      </div>
    </footer>
  );
}

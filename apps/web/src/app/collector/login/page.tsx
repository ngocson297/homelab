import { CollectorLoginForm } from "@/components/collector-login-form";
import { Card } from "@/components/ui";

export default function CollectorLoginPage() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[var(--background)] px-5 py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--primary-700)]">
          HomeLab Collector
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          Đăng nhập nhân viên lấy mẫu
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Dành cho nhân viên lấy mẫu được phân công trong hệ thống.
        </p>
        <CollectorLoginForm />
      </Card>
    </main>
  );
}

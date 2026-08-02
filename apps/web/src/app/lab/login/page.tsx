import { LabLoginForm } from "@/components/lab-login-form";
import { Card } from "@/components/ui";

export default function LabLoginPage() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[var(--background)] px-5 py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--primary-700)]">
          HomeLab Lab
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          Đăng nhập phòng xét nghiệm
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Chỉ dành cho nhân viên phòng xét nghiệm được cấp quyền.
        </p>
        <LabLoginForm />
      </Card>
    </main>
  );
}

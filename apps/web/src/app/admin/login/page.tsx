import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { Card } from "@/components/ui";
import { getStaffSession } from "@/lib/staff-auth-server";

export default async function AdminLoginPage() {
  const cookieHeader = (await cookies()).toString();
  if (cookieHeader && (await getStaffSession(cookieHeader))) redirect("/admin");
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[var(--background)] px-5 py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--primary-700)]">
          HomeLab Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold">Đăng nhập nhân viên</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Khu vực dành cho nhân viên được cấp quyền.
        </p>
        <AdminLoginForm />
      </Card>
    </main>
  );
}

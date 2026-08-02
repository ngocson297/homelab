import { LabLoginForm } from "@/components/lab-login-form";

export default function LabLoginPage() {
  return <main className="mx-auto min-h-screen max-w-md px-5 py-16"><section className="rounded-3xl bg-white p-7 shadow"><p className="font-bold text-teal-800">HomeLab Lab</p><h1 className="mt-2 text-3xl font-bold">Đăng nhập phòng xét nghiệm</h1><p className="mt-2 text-slate-600">Chỉ dành cho nhân viên phòng xét nghiệm được cấp quyền.</p><LabLoginForm /></section></main>;
}

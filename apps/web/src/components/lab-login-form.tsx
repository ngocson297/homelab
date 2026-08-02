"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { staffLogin, staffLogout, StaffAuthError } from "@/lib/staff-auth";

export function LabLoginForm() {
  const router = useRouter();
  const submitting = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      const user = await staffLogin({ email: email.trim().toLowerCase(), password });
      setPassword("");
      if (user.role !== "LAB_STAFF") {
        await staffLogout();
        setError("Tài khoản không có quyền truy cập cổng phòng xét nghiệm.");
        return;
      }
      router.replace("/lab");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof StaffAuthError ? reason.message : "Không thể đăng nhập.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="mt-6 space-y-4">
    <label className="block font-medium" htmlFor="lab-email">Email</label>
    <input id="lab-email" required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full rounded-xl border px-4 focus:outline-none focus:ring-2 focus:ring-teal-700" />
    <label className="block font-medium" htmlFor="lab-password">Mật khẩu</label>
    <input id="lab-password" required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border px-4 focus:outline-none focus:ring-2 focus:ring-teal-700" />
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
    <button disabled={loading} className="min-h-12 w-full rounded-xl bg-teal-800 font-bold text-white disabled:opacity-50">{loading ? "Đang đăng nhập…" : "Đăng nhập"}</button>
  </form>;
}

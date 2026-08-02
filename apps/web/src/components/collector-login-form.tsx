"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, FieldError, inputClass } from "@/components/ui";
import { staffLogin, staffLogout, StaffAuthError } from "@/lib/staff-auth";

export function CollectorLoginForm() {
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
      const user = await staffLogin({
        email: email.trim().toLowerCase(),
        password,
      });
      setPassword("");
      if (user.role !== "COLLECTOR") {
        await staffLogout();
        setError(
          "Tài khoản không có quyền truy cập cổng nhân viên lấy mẫu.",
        );
        return;
      }
      router.replace("/collector");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof StaffAuthError
          ? reason.message
          : "Không thể đăng nhập.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
      <LoginField
        id="collector-email"
        label="Email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={setEmail}
      />
      <LoginField
        id="collector-password"
        label="Mật khẩu"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      <Button disabled={loading} className="w-full" variant="primary">
        {loading ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
    </form>
  );
}

function LoginField({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const error = value === "" ? undefined : undefined;
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        required
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass(false)}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  FieldError,
  inputClass,
} from "@/components/ui";
import { StaffAuthError, staffLogin } from "@/lib/staff-auth";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const next = {
      email: !/^\S+@\S+\.\S+$/.test(email.trim())
        ? "Email không hợp lệ."
        : undefined,
      password: !/^(?=.*[A-Za-z])(?=.*\d).{10,128}$/.test(password)
        ? "Mật khẩu phải có ít nhất 10 ký tự, gồm chữ và số."
        : undefined,
    };
    setErrors(next);
    if (next.email || next.password) return;
    submitting.current = true;
    setLoading(true);
    setError(null);
    try {
      await staffLogin({ email: email.trim().toLowerCase(), password });
      setPassword("");
      router.replace("/admin");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof StaffAuthError
          ? requestError.message
          : "Hệ thống chưa thể đăng nhập lúc này.",
      );
      queueMicrotask(() => alertRef.current?.focus());
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-7 space-y-5">
      <Field
        id="admin-email"
        label="Email"
        type="email"
        value={email}
        error={errors.email}
        onChange={setEmail}
        autoComplete="username"
      />
      <div>
        <Field
          id="admin-password"
          label="Mật khẩu"
          type={showPassword ? "text" : "password"}
          value={password}
          error={errors.password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          className="focus-ring mt-2 rounded-lg px-2 py-1 text-sm font-semibold text-[var(--primary-800)]"
          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        </button>
      </div>
      {error && (
        <div ref={alertRef} tabIndex={-1} className="outline-none">
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        </div>
      )}
      <Button disabled={loading} className="w-full" variant="secondary">
        {loading ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  type,
  value,
  error,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={inputClass(Boolean(error))}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

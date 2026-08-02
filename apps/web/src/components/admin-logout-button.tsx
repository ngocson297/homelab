"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { staffLogout } from "@/lib/staff-auth";

export function AdminLogoutButton({
  redirectTo = "/admin/login",
}: { redirectTo?: string } = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div>
      <button
        disabled={loading}
        onClick={async () => {
          if (loading) return;
          setLoading(true);
          setError(false);
          try {
            await staffLogout();
            router.replace(redirectTo);
            router.refresh();
          } catch {
            setError(true);
            setLoading(false);
          }
        }}
        className="focus-ring min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary-700)] hover:text-[var(--primary-800)] disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Đang đăng xuất…" : "Đăng xuất"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--danger-700)]">
          Không thể đăng xuất. Vui lòng thử lại.
        </p>
      )}
    </div>
  );
}

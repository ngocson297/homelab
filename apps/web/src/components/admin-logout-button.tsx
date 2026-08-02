"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { staffLogout } from "@/lib/staff-auth";
export function AdminLogoutButton() { const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState(false); return <div><button disabled={loading} onClick={async () => { if (loading) return; setLoading(true); setError(false); try { await staffLogout(); router.replace("/admin/login"); router.refresh(); } catch { setError(true); setLoading(false); } }} className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold">{loading ? "Đang đăng xuất…" : "Đăng xuất"}</button>{error && <p role="alert" className="mt-2 text-sm text-red-700">Không thể đăng xuất. Vui lòng thử lại.</p>}</div>; }

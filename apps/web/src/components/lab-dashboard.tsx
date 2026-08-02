/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLabSpecimens, getLabSummary, LabPortalError, type LabSpecimenList, type LabSummary } from "@/lib/lab-portal";

const allowedStatuses = new Set(["IN_TRANSIT", "RECEIVED", "ACCEPTED", "REJECTED"]);

export function LabDashboard({ initialStatus }: { initialStatus?: string }) {
  const status = initialStatus && allowedStatuses.has(initialStatus) ? initialStatus : "IN_TRANSIT";
  const [summary, setSummary] = useState<LabSummary | null>(null);
  const [list, setList] = useState<LabSpecimenList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getLabSummary(), getLabSpecimens(new URLSearchParams({ status, page: "1", limit: "20" }).toString())])
      .then(([nextSummary, nextList]) => { if (active) { setSummary(nextSummary); setList(nextList); setError(""); } })
      .catch((reason) => { if (active) setError(reason instanceof LabPortalError ? reason.message : "Không thể tải dữ liệu phòng xét nghiệm."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status]);

  return <>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">Tổng quan phòng xét nghiệm</h1><p className="mt-1 text-slate-600">Số liệu vận hành không tải toàn bộ hồ sơ bệnh phẩm để đếm.</p></div><Link href="/lab/intake" className="rounded-xl bg-teal-800 px-5 py-3 font-bold text-white">Quét tiếp nhận mẫu</Link></div>
    {loading && !summary && <p role="status" className="mt-6 rounded-xl bg-white p-5">Đang tải tổng quan…</p>}
    {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-5 text-red-800">{error}</p>}
    {summary && <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Đang vận chuyển", summary.inTransit],
      ["Đã tiếp nhận hôm nay", summary.receivedToday],
      ["Bị từ chối hôm nay", summary.rejectedToday],
      ["Order cần lấy lại", summary.ordersRequiringRecollection],
    ].map(([label, value]) => <section key={label} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold text-teal-800">{value}</p></section>)}</div>}
    <section className="mt-7 rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">Danh sách: {status}</h2><div className="flex gap-2"><Link className="rounded border px-3 py-1" href="/lab?status=RECEIVED">Đã tiếp nhận</Link><Link className="rounded border px-3 py-1" href="/lab?status=REJECTED">Bị từ chối</Link></div></div>
      {loading && <p role="status" className="mt-4">Đang tải danh sách…</p>}
      {!loading && list?.data.length === 0 && <p className="mt-4 rounded bg-slate-50 p-4 text-slate-600">Không có bệnh phẩm ở trạng thái này.</p>}
      {list && list.data.length > 0 && <ul className="mt-4 divide-y">{list.data.map((specimen) => <li key={specimen.specimenCode} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><strong>{specimen.specimenCode}</strong><p className="text-sm text-slate-600">{specimen.specimenType} · {specimen.containerType} · {specimen.orderCode}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{specimen.status}</span><Link href={`/lab/specimens/${encodeURIComponent(specimen.specimenCode)}`} className="font-semibold text-teal-800 underline">Xem chi tiết</Link></div></li>)}</ul>}
    </section>
  </>;
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LabSpecimenOverview } from "@/components/lab-specimen-overview";
import { getLabSpecimen, LabPortalError, type LabSpecimenDetail } from "@/lib/lab-portal";

export function LabSpecimenDetailView({ specimenCode }: { specimenCode: string }) {
  const router = useRouter();
  const [specimen, setSpecimen] = useState<LabSpecimenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getLabSpecimen(specimenCode).then((value) => { if (active) setSpecimen(value); }).catch((reason) => {
      if (reason instanceof LabPortalError && (reason.status === 401 || reason.status === 403)) router.replace("/lab/login");
      else if (active) setError(reason instanceof Error ? reason.message : "Không thể tải bệnh phẩm.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router, specimenCode]);
  if (loading) return <p role="status">Đang tải bệnh phẩm…</p>;
  if (error) return <p role="alert" className="rounded bg-red-50 p-4 text-red-800">{error}</p>;
  if (!specimen) return <p>Không có dữ liệu bệnh phẩm.</p>;
  return <><Link href="/lab/intake" className="font-semibold text-teal-800 underline">← Quay lại tiếp nhận</Link><h1 className="my-5 text-3xl font-bold">Chi tiết bệnh phẩm</h1><LabSpecimenOverview specimen={specimen} /></>;
}

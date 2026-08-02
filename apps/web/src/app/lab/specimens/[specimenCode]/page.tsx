import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LabShell } from "@/components/lab-shell";
import { LabSpecimenDetailView } from "@/components/lab-specimen-detail";
import { getStaffSession } from "@/lib/staff-auth-server";

export default async function LabSpecimenPage({ params }: { params: Promise<{ specimenCode: string }> }) {
  const user = await getStaffSession((await cookies()).toString());
  if (!user || user.role !== "LAB_STAFF") redirect("/lab/login");
  const { specimenCode } = await params;
  return <LabShell name={user.fullName}><LabSpecimenDetailView specimenCode={specimenCode} /></LabShell>;
}

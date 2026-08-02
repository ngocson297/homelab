import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LabDashboard } from "@/components/lab-dashboard";
import { LabShell } from "@/components/lab-shell";
import { getStaffSession } from "@/lib/staff-auth-server";

export default async function LabPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getStaffSession((await cookies()).toString());
  if (!user) redirect("/lab/login");
  if (user.role !== "LAB_STAFF") redirect("/lab/login");
  const { status } = await searchParams;
  return <LabShell name={user.fullName}><LabDashboard initialStatus={status} /></LabShell>;
}

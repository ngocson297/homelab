import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LabIntake } from "@/components/lab-intake";
import { LabShell } from "@/components/lab-shell";
import { getStaffSession } from "@/lib/staff-auth-server";

export default async function LabIntakePage() {
  const user = await getStaffSession((await cookies()).toString());
  if (!user || user.role !== "LAB_STAFF") redirect("/lab/login");
  return <LabShell name={user.fullName}><LabIntake /></LabShell>;
}

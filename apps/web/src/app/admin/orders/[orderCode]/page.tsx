import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminOrderDetailView } from "@/components/admin-order-detail";
import { AdminShell } from "@/components/admin-shell";
import { getStaffSession } from "@/lib/staff-auth-server";
export default async function AdminOrderPage({ params }: { params: Promise<{ orderCode: string }> }) { const user = await getStaffSession((await cookies()).toString()); if (!user) redirect("/admin/login"); if (user.role !== "ADMIN") return <p>Không có quyền truy cập.</p>; const { orderCode } = await params; return <AdminShell name={user.fullName}><AdminOrderDetailView orderCode={orderCode} /></AdminShell>; }

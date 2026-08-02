import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminOrderListView } from "@/components/admin-order-list";
import { AdminShell } from "@/components/admin-shell";
import { getStaffSession } from "@/lib/staff-auth-server";
export default async function AdminOrdersPage() { const user = await getStaffSession((await cookies()).toString()); if (!user) redirect("/admin/login"); if (user.role !== "ADMIN") return <p>Không có quyền truy cập.</p>; return <AdminShell name={user.fullName}><h1 className="text-3xl font-bold">Đơn hàng</h1><p className="mt-2 text-slate-600">Tìm kiếm và quản lý lịch lấy mẫu tại nhà.</p><AdminOrderListView /></AdminShell>; }

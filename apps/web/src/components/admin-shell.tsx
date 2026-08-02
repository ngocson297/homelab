import { PortalShell } from "@/components/portal-shell";

export function AdminShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      product="HomeLab Admin"
      name={name}
      logoutTo="/admin/login"
      links={[
        { label: "Tổng quan", href: "/admin" },
        { label: "Đơn hàng", href: "/admin/orders" },
        { label: "Nhân viên lấy mẫu", href: "/admin/collectors" },
      ]}
    >
      {children}
    </PortalShell>
  );
}

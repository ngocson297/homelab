import { PortalShell } from "@/components/portal-shell";

export function LabShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      product="HomeLab Lab"
      name={name}
      logoutTo="/lab/login"
      links={[
        { label: "Tổng quan", href: "/lab" },
        { label: "Tiếp nhận mẫu", href: "/lab/intake" },
        { label: "Mẫu đã tiếp nhận", href: "/lab?status=RECEIVED" },
        { label: "Mẫu bị từ chối", href: "/lab?status=REJECTED" },
      ]}
    >
      {children}
    </PortalShell>
  );
}

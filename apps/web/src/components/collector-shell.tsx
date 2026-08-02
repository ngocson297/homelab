import { PortalShell } from "@/components/portal-shell";

export function CollectorShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      product="HomeLab Collector"
      name={name}
      logoutTo="/collector/login"
      links={[
        { label: "Nhiệm vụ hôm nay", href: "/collector" },
        { label: "Tất cả nhiệm vụ", href: "/collector/orders" },
      ]}
    >
      {children}
    </PortalShell>
  );
}

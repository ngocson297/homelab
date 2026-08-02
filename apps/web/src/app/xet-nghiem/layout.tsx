import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";

export default function TestCatalogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <SiteHeader />
      {children}
      <PublicFooter />
    </div>
  );
}

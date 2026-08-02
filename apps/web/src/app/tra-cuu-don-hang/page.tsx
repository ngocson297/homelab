import type { Metadata } from "next";
import { OrderLookup } from "@/components/order-lookup";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Tra cứu đơn xét nghiệm | HomeLab",
};

export default function OrderLookupPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <SiteHeader />
      <OrderLookup />
      <PublicFooter />
    </div>
  );
}

import type { Metadata } from "next";
import { OrderLookup } from "@/components/order-lookup";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Tra cứu đơn xét nghiệm | HomeLab" };

export default function OrderLookupPage() {
  return <div className="min-h-screen bg-[#f4f8f7] text-slate-900"><SiteHeader /><OrderLookup /></div>;
}

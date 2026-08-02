import { BookingSuccess } from "@/components/booking-success";
import { SiteHeader } from "@/components/site-header";

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-[#f4f8f7] text-slate-900">
      <SiteHeader />
      <BookingSuccess />
    </div>
  );
}

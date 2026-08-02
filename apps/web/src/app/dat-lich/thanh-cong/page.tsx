import { BookingSuccess } from "@/components/booking-success";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <SiteHeader />
      <BookingSuccess />
      <PublicFooter />
    </div>
  );
}

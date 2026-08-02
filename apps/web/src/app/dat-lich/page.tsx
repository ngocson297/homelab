import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import { BookingForm } from "@/components/booking-form";

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <SiteHeader />
      <BookingForm />
      <PublicFooter />
    </div>
  );
}

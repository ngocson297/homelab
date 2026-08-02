import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { BookingResultProvider } from "@/components/booking-result-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HomeLab",
  description: "Nền tảng đặt lịch lấy mẫu xét nghiệm tại nhà",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-lg bg-white px-4 py-3 font-semibold text-[var(--primary-900)] shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Bỏ qua phần điều hướng
        </a>
        <CartProvider>
          <BookingResultProvider>{children}</BookingResultProvider>
        </CartProvider>
      </body>
    </html>
  );
}

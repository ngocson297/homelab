"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { ButtonLink } from "@/components/ui";

export function SiteHeader() {
  const { items, hydrated } = useCart();
  const count = hydrated ? items.length : 0;
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 backdrop-blur">
      <div className="app-container flex items-center justify-between gap-4 py-3">
        <Link
          href="/"
          className="focus-ring flex items-center gap-3 rounded-xl"
          aria-label="HomeLab - Trang chủ"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary-800)] text-lg font-bold text-white">
            H
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-[var(--text-primary)]">
              HomeLab
            </span>
            <span className="hidden text-xs text-[var(--text-secondary)] sm:block">
              Chăm sóc xét nghiệm tại nhà
            </span>
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Điều hướng chính"
        >
          <NavLink href="/xet-nghiem">Xét nghiệm</NavLink>
          <NavLink href="/#quy-trinh">Quy trình</NavLink>
          <NavLink href="/tra-cuu-don-hang">Tra cứu đơn</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/gio-xet-nghiem"
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-white px-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary-700)] hover:text-[var(--primary-800)]"
            aria-label={`Giỏ xét nghiệm, ${count} xét nghiệm`}
          >
            <span>Giỏ</span>
            <span
              className="grid min-w-6 place-items-center rounded-full bg-[var(--primary-800)] px-1.5 text-xs leading-6 text-white"
              aria-hidden="true"
            >
              {hydrated ? count : "…"}
            </span>
          </Link>
          <ButtonLink href="/dat-lich" className="hidden sm:inline-flex">
            Đặt lịch
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="focus-ring rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--primary-50)] hover:text-[var(--primary-800)]"
    >
      {children}
    </Link>
  );
}

import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin-logout-button";

export function PortalShell({
  product,
  name,
  links,
  logoutTo,
  children,
}: {
  product: string;
  name: string;
  links: readonly { label: string; href: string }[];
  logoutTo: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary-800)] text-lg font-bold text-white">
              H
            </span>
            <div>
              <p className="font-bold text-[var(--primary-900)]">{product}</p>
              <p className="text-sm text-[var(--text-secondary)]">{name}</p>
            </div>
          </div>
          <nav
            aria-label={product}
            className="flex flex-wrap items-center gap-2"
          >
            {links.map((link) => (
              <Link
                key={`${link.label}-${link.href}`}
                href={link.href}
                className="focus-ring rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--primary-50)] hover:text-[var(--primary-800)]"
              >
                {link.label}
              </Link>
            ))}
            <AdminLogoutButton redirectTo={logoutTo} />
          </nav>
        </div>
      </header>
      <div id="main-content" className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        {children}
      </div>
    </main>
  );
}

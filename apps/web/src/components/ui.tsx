import Link from "next/link";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-red-200 bg-red-50 text-red-900",
};

const buttonVariants = {
  primary:
    "border-transparent bg-[var(--primary-800)] text-white hover:bg-[var(--primary-900)]",
  secondary:
    "border-transparent bg-slate-900 text-white hover:bg-slate-700",
  outline:
    "border-[var(--border-strong)] bg-white text-[var(--text-primary)] hover:border-[var(--primary-700)] hover:text-[var(--primary-800)]",
  ghost:
    "border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--primary-50)] hover:text-[var(--primary-800)]",
  danger:
    "border-transparent bg-[var(--danger-700)] text-white hover:bg-red-800",
} as const;

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
  ...props
}: {
  href: string;
  variant?: keyof typeof buttonVariants;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className">) {
  return (
    <Link
      href={href}
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: {
  variant?: keyof typeof buttonVariants;
  className?: string;
  children: ReactNode;
} & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-700)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55";

export function Card({
  as,
  className = "",
  children,
  ...props
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  const Component = as ?? "section";
  return (
    <Component className={`medical-panel ${className}`} {...props}>
      {children}
    </Component>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary-700)]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 max-w-3xl text-balance text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1.5 text-sm font-medium text-[var(--danger-700)]">
      {message}
    </p>
  ) : null;
}

export function inputClass(hasError = false): string {
  return `mt-2 min-h-12 w-full rounded-[var(--radius-control)] border bg-white px-4 py-3 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:ring-2 ${
    hasError
      ? "border-red-500 focus:border-red-600 focus:ring-red-200"
      : "border-[var(--border-strong)] focus:border-[var(--primary-700)] focus:ring-sky-100"
  }`;
}

export function StatusBadge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${toneClasses[tone]} ${className}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

export function Alert({
  tone = "info",
  children,
  className = "",
  role,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      role={role}
      className={`rounded-[var(--radius-card)] border p-4 text-sm leading-6 ${toneClasses[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] bg-white px-6 py-12 text-center">
      <div
        className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--primary-50)] text-[var(--primary-800)]"
        aria-hidden="true"
      >
        <span className="size-3 rounded-full border-2 border-current" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="medical-panel grid gap-3 p-6"
      aria-label={label}
    >
      <div className="skeleton h-4 w-36 rounded-full" />
      <div className="skeleton h-12 rounded-xl" />
      <div className="skeleton h-12 w-3/4 rounded-xl" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Timeline({
  items,
  ariaLabel,
}: {
  ariaLabel: string;
  items: { title: string; description?: string | null; time?: string | null }[];
}) {
  return (
    <ol className="space-y-5" aria-label={ariaLabel}>
      {items.map((item, index) => (
        <li key={`${item.title}-${item.time ?? index}`} className="relative pl-7">
          <span
            className="absolute left-0 top-1 grid size-4 place-items-center rounded-full border-2 border-[var(--primary-700)] bg-white"
            aria-hidden="true"
          >
            <span className="size-1.5 rounded-full bg-[var(--primary-700)]" />
          </span>
          {index < items.length - 1 && (
            <span
              className="absolute left-[7px] top-5 h-[calc(100%+0.25rem)] w-px bg-[var(--border)]"
              aria-hidden="true"
            />
          )}
          <p className="font-bold text-[var(--text-primary)]">{item.title}</p>
          {item.description && (
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {item.description}
            </p>
          )}
          {item.time && (
            <time
              className="mt-1 block text-xs text-[var(--text-muted)]"
              dateTime={item.time}
            >
              {item.time}
            </time>
          )}
        </li>
      ))}
    </ol>
  );
}

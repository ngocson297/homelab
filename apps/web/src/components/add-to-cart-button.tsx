"use client";

import { useCart } from "@/components/cart-provider";
import { labTestToCartItem } from "@/lib/cart-state";
import type { LabTest } from "@/lib/lab-tests";

export function AddToCartButton({ test }: { test: LabTest }) {
  const { items, hydrated, add } = useCart();
  const added = items.some((item) => item.id === test.id);
  const disabled =
    !hydrated || added || test.status !== "ACTIVE" || !test.homeCollectable;

  const label = !hydrated
    ? "Đang tải giỏ…"
    : added
      ? "Đã thêm"
      : test.status === "INACTIVE"
        ? "Tạm ngưng"
        : !test.homeCollectable
          ? "Không hỗ trợ tại nhà"
          : "Thêm vào giỏ";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => add(labTestToCartItem(test))}
      aria-label={added ? `${test.name} đã có trong giỏ` : `Thêm ${test.name} vào giỏ`}
      className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary-800)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-700)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
    >
      {label}
    </button>
  );
}

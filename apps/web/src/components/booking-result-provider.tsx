"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CompletedOrder } from "@/lib/booking";

export const LAST_ORDER_SESSION_KEY = "homelab.last-order-code.v1";

type BookingResultContextValue = {
  completedOrder: CompletedOrder | null;
  saveCompletedOrder: (order: CompletedOrder) => void;
};

const BookingResultContext = createContext<BookingResultContextValue | null>(null);

export function BookingResultProvider({ children }: { children: ReactNode }) {
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const value = useMemo(
    () => ({
      completedOrder,
      saveCompletedOrder: (order: CompletedOrder) => {
        setCompletedOrder(order);
        window.sessionStorage.setItem(LAST_ORDER_SESSION_KEY, order.orderCode);
      },
    }),
    [completedOrder],
  );
  return (
    <BookingResultContext.Provider value={value}>
      {children}
    </BookingResultContext.Provider>
  );
}

export function useBookingResult(): BookingResultContextValue {
  const context = useContext(BookingResultContext);
  if (!context) throw new Error("useBookingResult must be used within its provider");
  return context;
}

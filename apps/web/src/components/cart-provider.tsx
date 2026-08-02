"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  CART_STORAGE_KEY,
  cartReducer,
  initialCartState,
  readCart,
  type CartItem,
} from "@/lib/cart-state";

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  reconcile: (item: CartItem) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  useEffect(() => {
    dispatch({ type: "hydrate", items: readCart(window.localStorage) });
  }, []);

  useEffect(() => {
    if (state.hydrated) {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    }
  }, [state.hydrated, state.items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      hydrated: state.hydrated,
      add: (item) => dispatch({ type: "add", item }),
      remove: (id) => dispatch({ type: "remove", id }),
      clear: () => dispatch({ type: "clear" }),
      reconcile: (item) => dispatch({ type: "reconcile", item }),
    }),
    [state],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart phải được dùng bên trong CartProvider");
  return context;
}

import type { LabTest } from "@/lib/lab-tests";

export const CART_STORAGE_KEY = "homelab.lab-test-cart.v1";

export type CartItem = {
  id: string;
  code: string;
  name: string;
  specimenType: string;
  turnaroundTimeHours: number;
  price: number;
  available: boolean;
};

export type CartState = { items: CartItem[]; hydrated: boolean };

export type CartAction =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; item: CartItem }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "reconcile"; item: CartItem };

export const initialCartState: CartState = { items: [], hydrated: false };

function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false;
  const item = value;
  return (
    typeof item.id === "string" &&
    typeof item.code === "string" &&
    typeof item.name === "string" &&
    typeof item.specimenType === "string" &&
    Number.isSafeInteger(item.turnaroundTimeHours) &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    typeof item.available === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function labTestToCartItem(test: LabTest): CartItem {
  const price = Number(test.price);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Giá xét nghiệm không hợp lệ");
  }
  return {
    id: test.id,
    code: test.code,
    name: test.name,
    specimenType: test.specimenType,
    turnaroundTimeHours: test.turnaroundTimeHours,
    price,
    available: test.status === "ACTIVE",
  };
}

export function readCart(storage: Pick<Storage, "getItem">): CartItem[] {
  try {
    const raw = storage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const unique = new Map<string, CartItem>();
    for (const item of value) if (isCartItem(item)) unique.set(item.id, item);
    return [...unique.values()];
  } catch {
    return [];
  }
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { items: action.items, hydrated: true };
    case "add":
      return state.items.some((item) => item.id === action.item.id)
        ? state
        : { ...state, items: [...state.items, action.item] };
    case "remove":
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };
    case "clear":
      return { ...state, items: [] };
    case "reconcile":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.item.id ? action.item : item,
        ),
      };
  }
}

export function calculateCartTotal(items: CartItem[]): number {
  const minorUnits = items.reduce(
    (total, item) => total + (item.available ? Math.round(item.price * 100) : 0),
    0,
  );
  return minorUnits / 100;
}

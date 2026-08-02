import { beforeEach, describe, expect, it } from "vitest";
import {
  CART_STORAGE_KEY,
  calculateCartTotal,
  cartReducer,
  initialCartState,
  readCart,
  serializeCart,
  type CartItem,
} from "@/lib/cart-state";

const first: CartItem = { id: "1", code: "TEST-01", name: "Synthetic test one", specimenType: "Synthetic specimen", turnaroundTimeHours: 12, price: 100.25, homeCollectable: true, available: true };
const second: CartItem = { id: "2", code: "TEST-02", name: "Synthetic test two", specimenType: "Synthetic specimen", turnaroundTimeHours: 24, price: 200.1, homeCollectable: true, available: true };

describe("cart state", () => {
  beforeEach(() => localStorage.clear());

  it("adds an item", () => {
    expect(cartReducer(initialCartState, { type: "add", item: first }).items).toEqual([first]);
  });

  it("prevents duplicate items", () => {
    const state = { items: [first], hydrated: true };
    expect(cartReducer(state, { type: "add", item: first })).toBe(state);
  });

  it("removes an item", () => {
    const state = { items: [first, second], hydrated: true };
    expect(cartReducer(state, { type: "remove", id: first.id }).items).toEqual([second]);
  });

  it("clears the cart", () => {
    const state = { items: [first], hydrated: true };
    expect(cartReducer(state, { type: "clear" }).items).toEqual([]);
  });

  it("calculates the total without string concatenation and ignores unavailable items", () => {
    expect(calculateCartTotal([first, second])).toBe(300.35);
    expect(calculateCartTotal([first, { ...second, available: false }])).toBe(100.25);
  });

  it("recovers from invalid localStorage", () => {
    localStorage.setItem(CART_STORAGE_KEY, "{invalid json");
    expect(readCart(localStorage)).toEqual([]);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ id: "unsafe", price: "100" }]));
    expect(readCart(localStorage)).toEqual([]);
  });

  it("persists only lab test IDs", () => {
    expect(serializeCart([first, second])).toBe('["1","2"]');
    localStorage.setItem(CART_STORAGE_KEY, '["1","2","1"]');
    expect(readCart(localStorage).map((item) => item.id)).toEqual(["1", "2"]);
  });
});

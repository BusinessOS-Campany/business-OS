import type { CartItem } from "@/types";

const STORAGE_KEY = "cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function setCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cartUpdated"));
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  const existing = cart.find((i) => i.productId === item.productId && (i.color || null) === (item.color || null));
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }
  setCart(cart);
}

export function removeFromCart(productId: string, color?: string) {
  setCart(getCart().filter((i) => !(i.productId === productId && (i.color || null) === (color || null))));
}

export function updateQuantity(productId: string, color: string | undefined, delta: number) {
  const cart = getCart();
  const item = cart.find((i) => i.productId === productId && (i.color || null) === (color || null));
  if (item) {
    item.quantity = Math.max(1, item.quantity + delta);
    setCart(cart);
  }
}

export function cartCount(): number {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}

export function cartSubtotal(): number {
  return getCart().reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function getShippingCost() { return 500; }

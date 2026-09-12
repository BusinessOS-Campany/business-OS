import { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => { loadCart(); loadLastOrder(); }, []);

  async function loadCart() {
    try {
      const raw = await AsyncStorage.getItem("cart");
      setItems(raw ? JSON.parse(raw) : []);
    } catch { setItems([]); }
  }

  async function loadLastOrder() {
    try {
      const raw = await AsyncStorage.getItem("lastOrder");
      setLastOrder(raw ? JSON.parse(raw) : null);
    } catch { setLastOrder(null); }
  }

  const saveCart = useCallback(async (newItems) => {
    setItems(newItems);
    await AsyncStorage.setItem("cart", JSON.stringify(newItems));
  }, []);

  function addToCart(product) {
    const exists = items.find((i) => i.productId === product.productId && i.color === product.color);
    if (exists) {
      setItems((prev) => prev.map((i) => i === exists ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems((prev) => [...prev, { ...product, quantity: 1 }]);
    }
  }

  function removeFromCart(productId, color) {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.color === color)));
  }

  function updateQuantity(productId, color, delta) {
    setItems((prev) => prev.map((i) =>
      i.productId === productId && i.color === color
        ? { ...i, quantity: Math.max(1, i.quantity + delta) }
        : i
    ));
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const FREE_SHIPPING_THRESHOLD = 5000;
  const SHIPPING_COST = 500;
  const isFree = subtotal >= FREE_SHIPPING_THRESHOLD;

  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem("appliedCoupon").then((c) => {
      if (c) setAppliedCoupon(c);
    });
  }, []);

  async function applyCoupon(code) {
    await AsyncStorage.setItem("appliedCoupon", code);
    setAppliedCoupon(code);
  }

  async function clearCoupon() {
    await AsyncStorage.removeItem("appliedCoupon");
    setAppliedCoupon(null);
  }

  return (
    <CartContext.Provider value={{
      items, setItems, addToCart, removeFromCart, updateQuantity, subtotal,
      lastOrder, setLastOrder, loadLastOrder,
      shippingCost: isFree ? 0 : SHIPPING_COST,
      isFreeShipping: isFree,
      freeThreshold: FREE_SHIPPING_THRESHOLD,
      appliedCoupon, applyCoupon, clearCoupon,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}

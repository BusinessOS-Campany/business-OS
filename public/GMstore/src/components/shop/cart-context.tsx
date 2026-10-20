"use client";
import { createContext, useContext, useState } from "react";
import { CartDrawer } from "@/components/shop/cart-drawer";

interface CartCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const CartContext = createContext<CartCtx>({ open: false, setOpen: () => {} });

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <CartContext.Provider value={{ open, setOpen }}>
      {children}
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

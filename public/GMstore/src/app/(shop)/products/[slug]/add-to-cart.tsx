"use client";
import { useState } from "react";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function AddToCartBtn({ product, color, size }: { product: { id: string; name: string; price: number; images: string[] }; color?: string; size?: string }) {
  const { t } = useI18n();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((i: any) => i.productId === product.id && i.color === color && i.size === size);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ productId: product.id, name: product.name, price: Number(product.price), image: product.images[0] || "", quantity: qty, color, size });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    setAdded(true);
    setQty(1);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center border-2 border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setQty(q => Math.max(1, q - 1))}
          className="h-10 w-10 flex items-center justify-center bg-background hover:bg-muted transition-colors border-none cursor-pointer"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-12 text-center text-sm font-semibold">{qty}</span>
        <button
          onClick={() => setQty(q => Math.min(99, q + 1))}
          className="h-10 w-10 flex items-center justify-center bg-background hover:bg-muted transition-colors border-none cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <button
        onClick={handleAdd}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.97]"
      >
        {added ? (
          <><Check className="h-5 w-5" />{t("detail.added")}</>
        ) : (
          <><ShoppingCart className="h-5 w-5" />{t("detail.add_to_cart")}</>
        )}
      </button>
    </div>
  );
}
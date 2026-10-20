"use client";
import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCurrency, USD_TO_YER } from "@/lib/currency/context";
import { useI18n } from "@/lib/i18n/provider";
import type { Currency } from "@/lib/currency/context";

const symbols: Record<Currency, string> = { yer: "YER", usd: "USD", sar: "SAR" };

function convert(yer: number, c: Currency): string {
  const usd = yer / USD_TO_YER;
  if (c === "sar") return (usd * (USD_TO_YER / 140)).toFixed(2);
  if (c === "usd") return usd.toFixed(2);
  return Math.round(yer).toLocaleString("ar-YE");
}

export function MobileStickyBar({ product, color }: { product: { id: string; name: string; price: number; images: string[]; stock: number }; color?: string }) {
  const { currency } = useCurrency();
  const { t } = useI18n();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((i: any) => i.productId === product.id && i.color === color);
    if (existing) existing.quantity += 1;
    else cart.push({ productId: product.id, name: product.name, price: Number(product.price), image: product.images[0] || "", quantity: 1, color });
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (product.stock <= 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t bg-background p-3 flex items-center gap-3 lg:hidden shadow-lg">
      <span className="text-lg font-bold shrink-0">
        {convert(product.price, currency)} {symbols[currency]}
      </span>
      <button
        onClick={handleAdd}
        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.97]"
      >
        {added ? <><Check className="h-4 w-4" />{t("detail.added")}</> : <><ShoppingCart className="h-4 w-4" />{t("detail.add_to_cart")}</>}
      </button>
    </div>
  );
}
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function AddToCartButton({ product, color: selectedColor, colors, size: selectedSize, colorStock }: { product: { id: string; name: string; price: number; images: string[]; stock: number }; color?: string; colors?: string[]; size?: string; colorStock?: Record<string, number> | null }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    setLoading(true);
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((i: any) => i.productId === product.id && i.color === (selectedColor || undefined));
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ productId: product.id, name: product.name, price: Number(product.price), image: product.images[0] || "", quantity: 1, color: selectedColor || undefined, size: selectedSize || undefined, colors });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    setLoading(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
      <Button size="lg" className="w-full md:w-auto relative overflow-hidden" onClick={handleAdd} loading={loading} disabled={product.stock === 0 || (!!selectedColor && !!colorStock && (colorStock[selectedColor] ?? product.stock) <= 0)}>
        <AnimatePresence mode="wait">
          {added ? (
            <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
              <Check className="h-5 w-5" /> {t("detail.added")}
            </motion.span>
          ) : (
            <motion.span key="cart" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {product.stock === 0 ? t("product.out_of_stock") : t("detail.add_to_cart")}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}

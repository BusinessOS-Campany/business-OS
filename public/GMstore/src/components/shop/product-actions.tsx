"use client";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";

export function ProductActions({
  product,
  colors,
  sizes,
  stock,
  colorStock,
  colorImages,
  onColorChange,
}: {
  product: { id: string; name: string; price: number; images: string[]; stock: number };
  colors: string[];
  sizes: string[];
  stock: number;
  colorStock?: Record<string, number> | null;
  colorImages?: Record<string, string> | null;
  onColorChange?: (color: string) => void;
}) {
  const [selectedColor, setSelectedColor] = useState(colors[0] || "");
  const [selectedSize, setSelectedSize] = useState(sizes[0] || "");
  const [qty, setQty] = useState(1);

  const selectedColorStock = selectedColor && colorStock ? (colorStock[selectedColor] ?? stock) : stock;
  const colorOutOfStock = selectedColorStock <= 0;

  return (
    <div className="space-y-4">
      {colors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            الألوان: <span className="text-foreground font-semibold">{selectedColor}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const cs = colorStock?.[c];
              const outOfStock = cs !== undefined && cs <= 0;
              return (
                <div key={c} className="relative">
                  <button
                    type="button"
                    onClick={() => { if (!outOfStock) { setSelectedColor(c); onColorChange?.(c); } }}
                    disabled={outOfStock}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${selectedColor === c ? "border-foreground scale-110 ring-2 ring-foreground/20" : outOfStock ? "border-border opacity-30 cursor-not-allowed" : "border-border hover:scale-105"}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                  {outOfStock && <span className="absolute inset-0 flex items-center justify-center"><span className="h-full w-0.5 bg-red-500 rotate-45 absolute" /></span>}
                </div>
              );
            })}
          </div>
          {colorStock && selectedColor && (
            <p className={`text-xs ${selectedColorStock <= 5 ? "text-amber-600" : "text-muted-foreground"}`}>
              المخزون لهذا اللون: {selectedColorStock}
            </p>
          )}
        </div>
      )}

      {sizes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            المقاسات: <span className="text-foreground font-semibold">{selectedSize}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSize(s)}
                className={`h-9 min-w-[48px] rounded-lg border-2 text-sm font-medium px-3 transition-all ${
                  selectedSize === s
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-muted-foreground bg-background text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center border-2 border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setQty(q => Math.max(1, q - 1))}
            className="h-10 w-10 flex items-center justify-center bg-background hover:bg-muted transition-colors border-none cursor-pointer"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-sm font-semibold text-foreground">{qty}</span>
          <button
            onClick={() => setQty(q => Math.min(selectedColorStock, q + 1))}
            className="h-10 w-10 flex items-center justify-center bg-background hover:bg-muted transition-colors border-none cursor-pointer"
            disabled={qty >= selectedColorStock}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AddToCartButton product={product} color={selectedColor || undefined} colors={colors} size={selectedSize || undefined} colorStock={colorStock} />
    </div>
  );
}

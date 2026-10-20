"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { localizedName } from "@/lib/i18n/localized";
import { Shield, RefreshCw, Truck, MessageCircle, Clock, Star } from "lucide-react";
import { ProductPriceSection } from "./price-section";
import { ProductColors } from "./colors";
import { AddToCartBtn } from "./add-to-cart";
import { MobileStickyBar } from "./mobile-sticky-bar";

export function ProductInfo({ product, avgRating, reviewCount, locale, selectedColor, onColorChange }: { product: { id: string; name: string; price: number; discount?: number | null; images: string[]; colors: string[]; sizes: string[]; stock: number; category?: { name: string; nameEn?: string | null } | null; description?: string | null; colorStock?: Record<string, number> | null }; avgRating: number; reviewCount: number; locale: string; selectedColor?: string; onColorChange?: (c: string) => void }) {
  const { t } = useI18n();
  const [localColor, setLocalColor] = useState(product.colors[0] || "");
  const effectiveColor = selectedColor ?? localColor;
  const handleColor = onColorChange ?? setLocalColor;
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || "");

  const hasColorStock = product.colorStock && Object.keys(product.colorStock).length > 0;
  const perColorStock = hasColorStock ? (product.colorStock![effectiveColor] ?? null) : null;
  const displayStock = perColorStock !== null ? perColorStock : product.stock;
  const totalStock = hasColorStock ? Object.values(product.colorStock!).reduce((a, b) => a + b, 0) : product.stock;

  return (
    <>
      <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">{product.name}</h1>
          {product.category && (
            <p className="text-sm text-muted-foreground">                  {localizedName(product.category, locale as any)}</p>
          )}
          {reviewCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{avgRating.toFixed(1)} ({reviewCount} {t("detail.reviews")})</span>
            </div>
          )}
        </div>

            <ProductPriceSection price={product.price} discount={product.discount ?? 0} />

        {product.colors.length > 0 && (
          <ProductColors colors={product.colors} colorStock={product.colorStock} totalStock={product.stock} selected={effectiveColor} onSelect={handleColor} />
        )}

        {product.sizes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t("detail.sizes")}</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <span key={s} onClick={() => setSelectedSize(s)} className={`h-9 min-w-[48px] inline-flex items-center justify-center rounded-lg border-2 px-3 text-sm font-medium cursor-pointer transition-all ${selectedSize === s ? "border-foreground bg-foreground/5" : "border-border hover:border-muted-foreground"}`}>{s}</span>
              ))}
            </div>
          </div>
        )}

        <p className={`text-xs font-medium ${totalStock > 0 ? "text-green-600" : "text-red-500"}`}>
          {totalStock > 0 ? `${t("detail.stock")} ${totalStock} ${t("detail.available")}` : t("detail.not_available")}
        </p>

        <div className="border-t border-border pt-4 space-y-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t("detail.delivery_estimate")}: {t("detail.delivery_note")}
          </p>
          <AddToCartBtn product={{ id: product.id, name: product.name, price: product.price, images: product.images }} color={effectiveColor} size={selectedSize} />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
              {t("detail.secure_payment")}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 text-primary shrink-0" />
              {t("detail.money_back")}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
              {t("detail.free_shipping")}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              {t("detail.contact_us")}
            </div>
          </div>
        </div>

        {product.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
        )}
      </div>

      <MobileStickyBar product={{ id: product.id, name: product.name, price: product.price, images: product.images, stock: product.stock }} color={selectedColor} />
    </>
  );
}
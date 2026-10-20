"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Expand, ShoppingCart, Star, Minus, Plus } from "lucide-react";
import { LocalizedName } from "@/components/localized";
import { useCurrency, USD_TO_YER, USD_TO_SAR, type Currency } from "@/lib/currency/context";
import { useI18n } from "@/lib/i18n/provider";
import { CompareButton } from "@/components/shop/compare-button";
import type { CartItem } from "@/types";

interface Props {
  product: any;
  open: boolean;
  onClose: () => void;
}

function ModalInner({ product, onClose }: { product: any; onClose: () => void }) {
  const { direction } = useI18n();
  const [imgIndex, setImgIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");
  const [qty, setQty] = useState(1);
  const [isFav, setIsFav] = useState(false);
  const { currency } = useCurrency();
  const [localCurrency, setLocalCurrency] = useState<Currency | null>(null);
  const displayCurrency = localCurrency !== null ? localCurrency : currency;
  const currencyLabels: Record<Currency, string> = { yer: "ريال", usd: "$", sar: "رس" };
  const productImages = product.images?.length ? product.images : [];
  const isRtl = direction === "rtl";

  function formatPrice(c: Currency) {
    const price = Number(product.price);
    if (c === "usd") return (price / USD_TO_YER).toFixed(2);
    if (c === "sar") return (price / USD_TO_YER * USD_TO_SAR).toFixed(2);
    return price.toFixed(2);
  }

  function cycleCurrency() {
    setLocalCurrency(prev => {
      const base = prev ?? currency;
      const idx = ["yer", "usd", "sar"].indexOf(base);
      return (["yer", "usd", "sar"] as Currency[])[(idx + 1) % 3];
    });
  }

  useEffect(() => {
    try {
      const favs: string[] = JSON.parse(localStorage.getItem("favorites") || "[]");
      setIsFav(favs.includes(product.id));
    } catch { setIsFav(false); }
  }, [product.id]);

  function toggleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      let favs: string[] = JSON.parse(localStorage.getItem("favorites") || "[]");
      if (favs.includes(product.id)) {
        favs = favs.filter((id: string) => id !== product.id);
        setIsFav(false);
      } else {
        favs.push(product.id);
        setIsFav(true);
      }
      localStorage.setItem("favorites", JSON.stringify(favs));
      window.dispatchEvent(new CustomEvent("favoritesUpdated"));
    } catch { /* noop */ }
  }

  function addToCart() {
    const cart: CartItem[] = JSON.parse(localStorage.getItem("cart") || "[]");
    const exists = cart.find((i) => i.productId === product.id && !i.color);
    if (!exists) {
      cart.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.images[0] || "",
        quantity: qty,
        colors: product.colors || undefined,
      });
      localStorage.setItem("cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }

  const avgRating = product.reviews?.length
    ? product.reviews.reduce((s: number, r: any) => s + r.rating, 0) / product.reviews.length
    : 0;
  const reviewCount = product.reviews?.length || 0;

  return (
    <motion.div
      key="wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.45)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-gray-900 grid grid-cols-1 md:grid-cols-2 relative max-h-[85vh] overflow-y-auto"
        style={{ width: "92%", maxWidth: 1450 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute left-5 top-5 w-[55px] h-[55px] border-none bg-[#222] text-white text-[34px] flex items-center justify-center cursor-pointer z-10 hover:opacity-90 transition-opacity"
          style={{ lineHeight: 1 }}
        >
          {'\u00D7'}
        </button>

        <div className="p-5 sm:p-10 md:p-[70px] flex flex-col order-2 md:order-1">
          <h2 className="text-xl sm:text-[28px] md:text-[38px] font-medium text-foreground mb-3 sm:mb-5" style={{ fontWeight: 500 }}>
            <LocalizedName item={product} />
          </h2>

          <div className="text-2xl sm:text-[36px] md:text-[48px] text-[var(--primary)] mb-3 sm:mb-5" style={{ fontWeight: 500 }}>
            {formatPrice(displayCurrency)} {currencyLabels[displayCurrency]}
          </div>

          {avgRating > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{avgRating.toFixed(1)} ({reviewCount})</span>
            </div>
          )}

          <p className="text-muted-foreground mb-5 sm:mb-[50px] text-sm sm:text-[18px] md:text-[22px]">
            شحن محسوب عند الشراء.
          </p>

          <p className="text-[#555] dark:text-gray-300 leading-relaxed text-sm sm:text-[18px] md:text-[22px]" style={{ lineHeight: 2 }}>
            {product.description || product.descriptionEn || ""}
          </p>

          <div className="flex items-center gap-2 sm:gap-[18px] mt-4 sm:mt-[35px] flex-wrap">
            <button onClick={toggleFav} className="w-10 h-10 sm:w-[65px] sm:h-[65px] rounded-full border-2 border-[#222] dark:border-gray-200 bg-white dark:bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Heart className={`h-4 w-4 sm:h-7 sm:w-7 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
            </button>

            <a href={`/products/${product.slug}`} className="w-10 h-10 sm:w-[65px] sm:h-[65px] rounded-full border-2 border-[#222] dark:border-gray-200 bg-white dark:bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Expand className="h-4 w-4 sm:h-7 sm:w-7" />
            </a>

            <div className="w-10 h-10 sm:w-[65px] sm:h-[65px] rounded-full border-2 border-[#222] dark:border-gray-200 bg-white dark:bg-gray-800 flex items-center justify-center">
              <CompareButton productId={product.id} iconClass="h-4 w-4 sm:h-7 sm:w-7" />
            </div>

            <button
              onClick={addToCart}
              className="border-none text-white px-4 sm:px-[55px] py-2 sm:py-[18px] rounded-[40px] text-sm sm:text-[18px] md:text-[22px] cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: "var(--primary)" }}
            >
              إضافة للسلة
            </button>

            <div className="flex items-center border-2 border-[#222] dark:border-gray-200 rounded-[40px] overflow-hidden">
              <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 sm:w-[60px] sm:h-[60px] border-none bg-white dark:bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Plus className="h-4 w-4 sm:h-6 sm:w-6" />
              </button>
              <span className="w-8 sm:w-[60px] text-center text-sm sm:text-[24px] text-foreground">{qty}</span>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 sm:w-[60px] sm:h-[60px] border-none bg-white dark:bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Minus className="h-4 w-4 sm:h-6 sm:w-6" />
              </button>
            </div>
          </div>

          {product.colors?.length > 0 && (
            <div className="flex items-center gap-3 mt-5">
              <span className="text-muted-foreground text-[18px]">الألوان:</span>
              <div className="flex gap-2">
                {product.colors.map((c: string) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-[30px] h-[30px] rounded-full border-2 transition-all ${selectedColor === c ? "border-foreground scale-110" : "border-border hover:scale-105"}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={addToCart}
            className="mt-[35px] h-[75px] border-none rounded-[45px] text-white text-[22px] md:text-[26px] cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: "#111" }}
          >
            اشتر الآن
          </button>
        </div>

        <div className="relative bg-[#f7f7f7] dark:bg-gray-800 flex items-center justify-center min-h-[400px] md:min-h-full order-1 md:order-2">
          {product.discount > 0 && (
            <div className="absolute top-5 right-5 z-10 w-[70px] h-[70px] rounded-full bg-[#e95a00] text-white flex items-center justify-center text-lg font-bold">
              -{product.discount}%
            </div>
          )}

          <button
            onClick={() => setImgIndex(i => (i - 1 + productImages.length) % productImages.length)}
            className="absolute left-[25px] w-[65px] h-[65px] rounded-full border-2 border-[#222] dark:border-gray-200 bg-white dark:bg-gray-800 text-[42px] flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
          >
            {isRtl ? '\u203A' : '\u2039'}
          </button>

          {productImages.length > 0 ? (
            <img src={productImages[imgIndex]} alt={product.name} className="w-[82%] object-contain max-h-[70vh]" />
          ) : (
            <div className="text-gray-400 text-lg">لا توجد صورة</div>
          )}

          <button
            onClick={() => setImgIndex(i => (i + 1) % productImages.length)}
            className="absolute right-[25px] w-[65px] h-[65px] rounded-full border-2 border-[#222] dark:border-gray-200 bg-white dark:bg-gray-800 text-[42px] flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
          >
            {isRtl ? '\u2039' : '\u203A'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function QuickViewModal({ product, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && <ModalInner key="modal" product={product} onClose={onClose} />}
    </AnimatePresence>,
    document.body
  );
}

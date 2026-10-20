"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart, Star, Eye, Share2, Expand } from "lucide-react";
import { CompareButton } from "@/components/shop/compare-button";
import { DealBadge } from "@/components/shop/deal-badge";
import { T } from "@/components/translate";
import { LocalizedName } from "@/components/localized";
import { useCurrency, USD_TO_YER, USD_TO_SAR, type Currency } from "@/lib/currency/context";
import type { CartItem } from "@/types";
import { QuickViewModal } from "./quick-view-modal";

function getLocalFavs(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("favorites") || "[]"); } catch { return []; }
}

function setLocalFavs(ids: string[]) {
  localStorage.setItem("favorites", JSON.stringify(ids));
  window.dispatchEvent(new Event("favoritesUpdated"));
}

function shareProduct(product: any): boolean {
  const url = window.location.origin + `/products/${product.slug}`;
  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) && typeof navigator.share === "function") {
    navigator.share({ title: product.name, url }).catch(() => {});
    return true;
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  } catch {}
  return false;
}

export function SwipeableProductCard({ product, isLoggedIn = false, favoriteIds }: { product: any; isLoggedIn?: boolean; favoriteIds?: Set<string> }) {
  const [toast, setToast] = useState<"cart" | "fav" | "share" | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const { currency } = useCurrency();
  const [localCurrency, setLocalCurrency] = useState<Currency | null>(null);
  const displayCurrency = localCurrency !== null ? localCurrency : currency;

  const currencyLabels: Record<Currency, string> = { yer: "ريال", usd: "$", sar: "رس" };

  function formatPrice(c: Currency) {
    const price = Number(product.price);
    if (c === "usd") return (price / USD_TO_YER).toFixed(2);
    if (c === "sar") return (price / USD_TO_YER * USD_TO_SAR).toFixed(2);
    return price.toFixed(2);
  }

  function formatOriginalPrice(c: Currency) {
    const disc = Number(product.discount) || 0;
    const originalPrice = disc >= 100 ? Number(product.price) * 2 : Number(product.price) / (1 - disc / 100);
    if (c === "usd") return (originalPrice / USD_TO_YER).toFixed(2);
    if (c === "sar") return (originalPrice / USD_TO_YER * USD_TO_SAR).toFixed(2);
    return originalPrice.toFixed(2);
  }

  function cycleCurrency() {
    setLocalCurrency(prev => {
      const base = prev ?? currency;
      const idx = ["yer", "usd", "sar"].indexOf(base);
      return (["yer", "usd", "sar"] as Currency[])[(idx + 1) % 3];
    });
  }
  const router = useRouter();
  const images = product.images?.length ? product.images : [];
  const hasMultiple = images.length > 1;
  const hasHoverImg = images.length > 1;

  const avgRating = product.reviews?.length
    ? product.reviews.reduce((s: number, r: any) => s + r.rating, 0) / product.reviews.length
    : 0;
  const reviewCount = product.reviews?.length || 0;

  useEffect(() => {
    if (isLoggedIn) {
      setIsFav(favoriteIds?.has(product.id) ?? false);
    } else {
      setIsFav(getLocalFavs().includes(product.id));
    }
  }, [isLoggedIn, favoriteIds, product.id]);

  useEffect(() => {
    if (isLoggedIn) return;
    const handler = () => setIsFav(getLocalFavs().includes(product.id));
    window.addEventListener("favoritesUpdated", handler);
    return () => window.removeEventListener("favoritesUpdated", handler);
  }, [isLoggedIn, product.id]);

  const toggleFav = useCallback(async () => {
    if (isLoggedIn) {
      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        const data = await res.json();
        setIsFav(data.favorited);
        window.dispatchEvent(new Event("favoritesUpdated"));
      } catch {}
    } else {
      const favs = getLocalFavs();
      const next = favs.includes(product.id) ? favs.filter((id) => id !== product.id) : [...favs, product.id];
      setLocalFavs(next);
      setIsFav(next.includes(product.id));
    }
  }, [isLoggedIn, product.id]);

  function addToCart() {
    const cart: CartItem[] = JSON.parse(localStorage.getItem("cart") || "[]");
    const exists = cart.find((i) => i.productId === product.id && !i.color);
    if (!exists) {
      cart.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.images[0] || "",
        quantity: 1,
        colors: product.colors || undefined,
      });
      localStorage.setItem("cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cartUpdated"));
      setToast("cart");
      setTimeout(() => setToast(null), 1500);
    }
  }

  return (
    <motion.div
      className="group relative bg-white dark:bg-gray-900 overflow-hidden rounded-lg border border-transparent hover:border-[var(--primary)]/20"
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <div className="relative bg-[#f5f5f5] dark:bg-gray-800">
        <div className="relative h-[250px] sm:h-[300px] overflow-hidden">
          {images.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={imgIndex}
                className="h-full w-full"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Link href={`/products/${product.slug}`} className="relative block h-full w-full">
                  <Image
                    src={images[imgIndex]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    draggable={false}
                  />
                </Link>
              </motion.div>
            </AnimatePresence>
          ) : (
            <Link href={`/products/${product.slug}`} className="flex h-full items-center justify-center text-gray-400 text-sm"><T k="product.no_image" /></Link>
          )}
          {hasHoverImg && (
            <Link href={`/products/${product.slug}`} className="absolute inset-0">
              <Image
                src={images[1]}
                alt={product.name}
                fill
                className="object-cover opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out group-hover:scale-110"
                sizes="(max-width: 768px) 50vw, 25vw"
                draggable={false}
              />
            </Link>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
        </div>

        {hasMultiple && (
          <motion.div
            className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
            drag="x"
            dragElastic={0}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) < 10) return;
              if (info.offset.x > 50 && imgIndex < images.length - 1) {
                setImgIndex(i => i + 1);
              } else if (info.offset.x < -50 && imgIndex > 0) {
                setImgIndex(i => i - 1);
              }
            }}
            onClick={() => router.push(`/products/${product.slug}`)}
          />
        )}
        {!hasMultiple && (
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => router.push(`/products/${product.slug}`)} />
        )}

        <div className="absolute top-2 left-2 z-20 flex flex-col gap-1.5">
          {product.discount > 0 && (
            <div className="w-9 h-9 rounded-full bg-[#e95a00] text-white flex items-center justify-center text-[10px] font-bold">
              -{product.discount}%
            </div>
          )}
          {product.stock <= 0 && (
            <div className="w-9 h-9 rounded-full bg-[#999] text-white flex items-center justify-center text-[10px] font-bold">
              نفذ
            </div>
          )}
          {product.dealEnd && <DealBadge dealEnd={product.dealEnd} />}
        </div>

        <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
          <motion.button
            initial={{ opacity: 0, x: 8, scale: 0.8 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 400, damping: 20 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(); setToast("fav"); setTimeout(() => setToast(null), 1500); }}
            className="text-white hover:scale-110 transition-transform leading-none drop-shadow-sm"
          >
            <Heart className={`h-5 w-5 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
          </motion.button>
          <motion.div
            initial={{ opacity: 0, x: 8, scale: 0.8 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
          >
            <Link href={`/products/${product.slug}`} className="text-white hover:scale-110 transition-transform leading-none drop-shadow-sm block">
              <Expand className="h-5 w-5" />
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 8, scale: 0.8 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 20 }}
          >
            <CompareButton productId={product.id} className="text-white hover:scale-110 transition-transform leading-none drop-shadow-sm" iconClass="h-5 w-5" />
          </motion.div>
        </div>

        <div className="absolute left-2 bottom-2 z-20">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.08, type: "spring", stiffness: 350, damping: 18 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden flex flex-col"
          >
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickViewOpen(true); }}
              className="w-9 h-9 border-none bg-white dark:bg-gray-800 cursor-pointer text-[#333] dark:text-gray-200 hover:bg-[var(--primary)] hover:text-white transition-all duration-200 flex items-center justify-center"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); const shared = shareProduct(product); if (!shared) { setToast("share"); setTimeout(() => setToast(null), 1500); } }}
              className="w-9 h-9 border-none bg-white dark:bg-gray-800 cursor-pointer text-[#333] dark:text-gray-200 hover:bg-[var(--primary)] hover:text-white transition-all duration-200 flex items-center justify-center"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </motion.div>
        </div>

        {product.brandLogo && (
          <Image src={product.brandLogo} alt={product.brand || ""} width={32} height={32} className="absolute top-[52px] left-2 z-20 pointer-events-none mix-blend-multiply" />
        )}

        {product.colors?.length > 0 && (
          <div className="absolute bottom-2 right-2 z-20 flex flex-col gap-1">
            {product.colors.slice(0, 6).map((c: string, i: number) => {
              const isSelected = selectedColor === c || (!selectedColor && i === 0);
              return (
                <motion.div
                  key={c}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * i, type: "spring", stiffness: 400, damping: 15 }}
                  className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center shrink-0"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedColor(c);
                      const ci = product.colorImages?.[c];
                      const idx = ci ? product.images?.indexOf(ci) : -1;
                      setImgIndex(idx >= 0 ? idx : (product.images?.length > i ? i : 0));
                    }}
                    className={`h-3 w-3 rounded-full border-2 transition-all shrink-0 ${isSelected ? "border-white scale-110" : "border-white/60 hover:scale-110"}`}
                    style={{ backgroundColor: c }}
                  />
                </motion.div>
              );
            })}
            {product.colors.length > 6 && (
              <span className="text-[8px] text-gray-600 font-medium text-center">+{product.colors.length - 6}</span>
            )}
          </div>
        )}

        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/0 group-hover:from-white/5 group-hover:via-transparent group-hover:to-transparent transition-all duration-700" />
        </div>
      </div>

      <Link href={`/products/${product.slug}`} className="block">
        <div className="p-2.5 text-center">
          <h3 className="text-xs leading-relaxed text-[var(--primary)] font-normal mb-1.5">
            <LocalizedName item={product} />
          </h3>

          <div className="text-[var(--primary)] text-[11px] mb-1.5">
            {avgRating > 0 ? (
              <span className="flex items-center justify-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {avgRating.toFixed(1)} ({reviewCount} <T k="detail.reviews" />)
              </span>
            ) : (
              <span>0 <T k="detail.reviews" /></span>
            )}
          </div>

          {product.discount > 0 && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-[var(--primary)] line-through">{formatOriginalPrice(displayCurrency)} {currencyLabels[displayCurrency]}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-1.5 flex-wrap mt-0.5">
            <span className="text-sm font-bold text-[var(--primary)]">{formatPrice(displayCurrency)} {currencyLabels[displayCurrency]}</span>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-2">
            <button
              onClick={(e) => { e.preventDefault(); toggleFav(); setToast("fav"); setTimeout(() => setToast(null), 1500); }}
              className={`p-1.5 rounded-full transition-colors ${isFav ? "text-rose-500" : "text-gray-400 hover:text-rose-500"}`}
            >
              <Heart className={`h-4 w-4 ${isFav ? "fill-rose-500" : ""}`} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); addToCart(); }}
              className="p-1.5 rounded-full text-gray-400 hover:text-emerald-500 transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); cycleCurrency(); }}
              className="text-[10px] text-gray-400 hover:text-[var(--primary)] transition-colors px-1.5 py-0.5 rounded border border-gray-300"
            >
              {currencyLabels[(["yer", "usd", "sar"] as Currency[])[(["yer", "usd", "sar"].indexOf(displayCurrency) + 1) % 3]]}
            </button>
          </div>
        </div>
      </Link>

      <AnimatePresence mode="wait">
        {toast === "cart" && (
          <motion.div
            key="toast-cart"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-white text-xs font-medium py-1.5 text-center z-20 shadow-lg"
          >
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 10 }}>
              ✓ أضيف إلى السلة
            </motion.span>
          </motion.div>
        )}
        {toast === "fav" && (
          <motion.div
            key="toast-fav"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`absolute bottom-0 left-0 right-0 ${isFav ? "bg-rose-500" : "bg-gray-500"} text-white text-xs font-medium py-1.5 text-center z-20 shadow-lg`}
          >
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 10 }}>
              {isFav ? "♥ أضيف إلى المفضلة" : "أزيل من المفضلة"}
            </motion.span>
          </motion.div>
        )}
        {toast === "share" && (
          <motion.div
            key="toast-share"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-[var(--primary)] text-white text-xs font-medium py-1.5 text-center z-20 shadow-lg"
          >
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 10 }}>
              ✓ نسخ الرابط
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
      <QuickViewModal product={product} open={quickViewOpen} onClose={() => setQuickViewOpen(false)} />
    </motion.div>
  );
}

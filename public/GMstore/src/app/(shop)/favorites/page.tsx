"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Heart, ArrowLeft, Trash2, Share2 } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion-wrappers";
import { SwipeableProductCard } from "@/components/shop/swipeable-product-card";
import { T } from "@/components/translate";

export default function FavoritesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocal = useCallback(async () => {
    const stored: string[] = (() => { try { return JSON.parse(localStorage.getItem("favorites") || "[]"); } catch { return []; } })();
    setIds(stored);
    if (stored.length === 0) { setProducts([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/products?ids=${stored.join(",")}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch { setProducts([]); }
    setLoading(false);
  }, []);

  const fetchServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/favorites");
      const data = await res.json();
      const favIds = (data as any[]).map((p: any) => p.id);
      setIds(favIds);
      setProducts(data);
    } catch { setProducts([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(session => {
      const uid = (session?.user as any)?.id;
      if (uid) { setUserId(uid); setIsLoggedIn(true); fetchServer(); }
      else { setUserId(null); setIsLoggedIn(false); fetchLocal(); }
    }).catch(() => fetchLocal());
  }, [fetchServer, fetchLocal]);

  useEffect(() => {
    window.addEventListener("favoritesUpdated", isLoggedIn ? fetchServer : fetchLocal);
    return () => window.removeEventListener("favoritesUpdated", isLoggedIn ? fetchServer : fetchLocal);
  }, [isLoggedIn, fetchServer, fetchLocal]);

  async function removeAll() {
    if (isLoggedIn) {
      await Promise.all(ids.map((id) =>
        fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: id }),
        })
      ));
      window.dispatchEvent(new Event("favoritesUpdated"));
    } else {
      localStorage.setItem("favorites", JSON.stringify([]));
      window.dispatchEvent(new Event("favoritesUpdated"));
    }
    setIds([]);
    setProducts([]);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <FadeIn>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-rose-500" />
            <h1 className="text-2xl font-bold"><T k="favorites.title" /></h1>
            {ids.length > 0 && (
              <span className="text-sm text-muted-foreground">({ids.length})</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn && ids.length > 0 && (
              <button
                onClick={() => {
                  const link = `${window.location.origin}/favorites/shared/${userId}`;
                  if (navigator.share) { navigator.share({ url: link }); }
                  else { navigator.clipboard?.writeText(link); }
                }}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <T k="favorites.share" />
              </button>
            )}
            {ids.length > 0 && (
              <button
                onClick={removeAll}
                className="flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <T k="favorites.remove" />
              </button>
            )}
            <Link href="/products" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" />
              <T k="favorites.browse" />
            </Link>
          </div>
        </div>
      </FadeIn>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-muted animate-pulse h-80" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 space-y-4"
        >
          <Heart className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <p className="text-lg text-muted-foreground"><T k="favorites.empty" /></p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <T k="favorites.browse" />
          </Link>
        </motion.div>
      ) : (
        <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {products.map((p: any) => (
            <StaggerItem key={p.id} className="relative group">
              <button
                onClick={async () => {
                  if (isLoggedIn) {
                    await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: p.id }) });
                    window.dispatchEvent(new Event("favoritesUpdated"));
                  } else {
                    const stored: string[] = JSON.parse(localStorage.getItem("favorites") || "[]");
                    localStorage.setItem("favorites", JSON.stringify(stored.filter((id: string) => id !== p.id)));
                    window.dispatchEvent(new Event("favoritesUpdated"));
                  }
                  setIds((prev) => prev.filter((id) => id !== p.id));
                  setProducts((prev) => prev.filter((pr: any) => pr.id !== p.id));
                }}
                className="absolute top-2 left-2 z-30 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <SwipeableProductCard product={p} isLoggedIn={isLoggedIn} favoriteIds={new Set(ids)} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { SwipeableProductCard } from "@/components/shop/swipeable-product-card";

const MAX = 8;
const STORAGE_KEY = "recentlyViewed";

export function trackView(productId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[];
    const next = [productId, ...raw.filter((id) => id !== productId)].slice(0, MAX);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function RecentlyViewed({ isLoggedIn, favoriteIds }: { isLoggedIn: boolean; favoriteIds: Set<string> }) {
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[];
      setIds(raw);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return; }
    fetch(`/api/products?ids=${ids.join(",")}&limit=${MAX}`)
      .then((r) => r.json())
      .then((data) => { setProducts(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ids]);

  if (loading || products.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">شاهدتها مؤخراً</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {products.map((p: any) => (
          <SwipeableProductCard key={p.id} product={p} isLoggedIn={isLoggedIn} favoriteIds={favoriteIds} />
        ))}
      </div>
    </section>
  );
}

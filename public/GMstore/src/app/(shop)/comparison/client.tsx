"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Trash2, ShoppingBag, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { getComparison, removeFromComparison, clearComparison } from "@/lib/comparison/store";
import { SwipeableProductCard } from "@/components/shop/swipeable-product-card";

interface Product {
  id: string; name: string; nameEn?: string | null; slug: string;
  price: number; images: string[]; colors: string[]; sizes: string[];
  stock: number; discount: number; brand?: string | null; description?: string | null;
  descriptionEn?: string | null;
  category: { id: string; name: string; nameEn?: string | null };
  reviews: { rating: number }[];
}

const attributeKeys = ["name", "price", "brand", "colors", "sizes", "rating", "stock", "discount", "description"] as const;

export function ComparisonClient({ isLoggedIn, initialFavIds }: { isLoggedIn: boolean; initialFavIds: string[] }) {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState<string[]>(initialFavIds);

  useEffect(() => {
    const ids = getComparison();
    if (ids.length === 0) { setLoading(false); return; }
    fetch(`/api/products/comparison?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const remove = (id: string) => {
    removeFromComparison(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">{t("comparison.empty")}</p>
        <Link href="/products" className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {t("comparison.browse")}
        </Link>
      </div>
    );
  }

  const getName = (p: Product) => locale === "en" && p.nameEn ? p.nameEn : p.name;
  const getDesc = (p: Product) => locale === "en" && p.descriptionEn ? p.descriptionEn : p.description;

  const attrRender: Record<string, (p: Product) => React.ReactNode> = {
    name: (p) => <Link href={`/products/${p.slug}`} className="font-semibold text-sm hover:text-primary">{getName(p)}</Link>,
    price: (p) => <span className="font-bold text-primary">{Number(p.price).toLocaleString()} ريال</span>,
    brand: (p) => p.brand ? <span>{p.brand}</span> : <span className="text-muted-foreground">—</span>,
    colors: (p) => p.colors.length > 0
      ? <div className="flex flex-wrap gap-1">{p.colors.map((c) => <span key={c} className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: c }} />)}</div>
      : <span className="text-muted-foreground">—</span>,
    sizes: (p) => p.sizes.length > 0
      ? <div className="flex flex-wrap gap-1">{p.sizes.map((s) => <span key={s} className="rounded border border-border px-2 py-0.5 text-[10px]">{s}</span>)}</div>
      : <span className="text-muted-foreground">—</span>,
    rating: (p) => {
      const avg = p.reviews.length ? (p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length) : 0;
      return (
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold">{avg.toFixed(1)}</span>
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
        </div>
      );
    },
    stock: (p) => <span className={p.stock > 0 ? "text-green-600" : "text-red-500"}>{p.stock > 0 ? `${p.stock}` : t("product.out_of_stock")}</span>,
    discount: (p) => p.discount > 0 ? <span className="text-primary font-semibold">-{p.discount}%</span> : <span className="text-muted-foreground">—</span>,
    description: (p) => <p className="text-xs text-muted-foreground line-clamp-4">{getDesc(p) || "—"}</p>,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{products.length} {t("comparison.count")}</p>
        <button onClick={() => { clearComparison(); setProducts([]); }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
          {t("comparison.clear")}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className="text-start text-sm font-semibold text-muted-foreground p-3 border-b border-border w-32" />
              {products.map((p) => (
                <th key={p.id} className="p-3 border-b border-border text-center align-top">
                  <div className="relative">
                    <Link href={`/products/${p.slug}`}>
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                        <img src={p.images[0]} alt={getName(p)} className="h-full w-full object-cover" />
                      </div>
                    </Link>
                    <button onClick={() => remove(p.id)} className="absolute -top-1 -end-1 p-1 rounded-full bg-background border border-border hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Link href={`/products/${p.slug}`} className="font-semibold text-sm hover:text-primary block mt-2">
                    {getName(p)}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attributeKeys.filter((k) => k !== "name").map((key) => (
              <tr key={key}>
                <td className="p-3 border-b border-border text-sm font-semibold text-muted-foreground whitespace-nowrap">
                  {t(`comparison.attribute_${key}`)}
                </td>
                {products.map((p) => (
                  <td key={p.id} className="p-3 border-b border-border text-sm text-center">
                    {attrRender[key](p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold mb-4">جميع المنتجات</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {products.map((p) => (
            <SwipeableProductCard key={p.id} product={p} isLoggedIn={isLoggedIn} favoriteIds={new Set(favIds)} />
          ))}
        </div>
      </div>
    </div>
  );
}

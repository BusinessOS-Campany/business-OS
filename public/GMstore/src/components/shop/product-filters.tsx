"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, X, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function ProductFilters({ categories: rawCategories, brands, colors, sizes }: { categories: { id: string; name: string; nameEn?: string | null; slug: string }[]; brands: string[]; colors: string[]; sizes: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);

  const currentCategory = searchParams.get("category") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const currentMin = searchParams.get("minPrice") || "";
  const currentMax = searchParams.get("maxPrice") || "";
  const currentInStock = searchParams.get("inStock") === "true";
  const currentFeatured = searchParams.get("featured") === "true";
  const currentQ = searchParams.get("q") || "";
  const currentBrand = searchParams.get("brand") || "";
  const currentColor = searchParams.get("color") || "";
  const currentSize = searchParams.get("size") || "";
  const currentMinRating = searchParams.get("minRating") || "";
  const currentNewArrivals = searchParams.get("newArrivals") === "true";
  const currentOnSale = searchParams.get("onSale") === "true";

  const categories = rawCategories;

  function buildUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  const hasActiveFilters = currentSort !== "newest" || currentMin || currentMax || currentInStock || currentFeatured || currentCategory || currentQ || currentBrand || currentColor || currentSize || currentMinRating || currentNewArrivals || currentOnSale;

  function clearAll() {
    router.push("/products");
  }

  const filterCount = [
    currentCategory, currentMin || currentMax ? "price" : "", currentInStock ? "stock" : "",
    currentFeatured ? "featured" : "", currentSort !== "newest" ? "sort" : "",
    currentBrand ? "brand" : "", currentColor ? "color" : "", currentSize ? "size" : "",
    currentMinRating ? "rating" : "", currentNewArrivals ? "new" : "", currentOnSale ? "sale" : "",
  ].filter(Boolean).length;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm hover:bg-muted transition-colors"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {t("products.filters")}
        {filterCount > 0 && (
          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{filterCount}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 end-0 z-50 w-80 bg-background border-s border-border p-6 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                {t("products.filters")}
              </h2>
              <button onClick={() => setOpen(false)} className="p-1 hover:text-primary transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Category */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("merchant.category")}</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories.map((c) => {
                    const label = locale === "en" && c.nameEn ? c.nameEn : c.name;
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          checked={currentCategory === c.slug}
                          onChange={() => router.push(buildUrl({ category: currentCategory === c.slug ? null : c.slug }))}
                          className="h-4 w-4 accent-primary"
                        />
                        {label}
                      </label>
                    );
                  })}
                  {currentCategory && (
                    <button onClick={() => router.push(buildUrl({ category: null }))} className="text-xs text-primary hover:underline">
                      {t("products.all")}
                    </button>
                  )}
                </div>
              </div>

              {/* Brand */}
              {brands.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">{t("products.brand")}</h3>
                  <select
                    value={currentBrand}
                    onChange={(e) => router.push(buildUrl({ brand: e.target.value || null }))}
                    className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary bg-background"
                  >
                    <option value="">{t("products.all_brands")}</option>
                    {brands.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Color */}
              {colors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">{t("products.color")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentColor && (
                      <button
                        onClick={() => router.push(buildUrl({ color: null }))}
                        className="text-xs text-primary hover:underline mb-1 w-full text-start"
                      >
                        {t("products.all")}
                      </button>
                    )}
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => router.push(buildUrl({ color: currentColor === c ? null : c }))}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${currentColor === c ? "border-primary scale-110" : "border-border hover:scale-110"}`}
                        style={{ backgroundColor: c.toLowerCase() }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Size */}
              {sizes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">{t("products.size")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => router.push(buildUrl({ size: currentSize === s ? null : s }))}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${currentSize === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("products.rating")}</h3>
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="rating"
                        checked={currentMinRating === String(r)}
                        onChange={() => router.push(buildUrl({ minRating: currentMinRating === String(r) ? null : String(r) }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < r ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                        ))}
                        <span className="mr-1 text-muted-foreground">& {t("products.any_rating")}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("products.price")}</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder={t("products.min_price")}
                    defaultValue={currentMin}
                    className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
                    onChange={(e) => {
                      const val = e.target.value;
                      router.push(buildUrl({ minPrice: val || null }));
                    }}
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="number"
                    min="0"
                    placeholder={t("products.max_price")}
                    defaultValue={currentMax}
                    className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
                    onChange={(e) => {
                      const val = e.target.value;
                      router.push(buildUrl({ maxPrice: val || null }));
                    }}
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("products.sort")}</h3>
                <select
                  value={currentSort}
                  onChange={(e) => router.push(buildUrl({ sort: e.target.value === "newest" ? null : e.target.value }))}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary bg-background"
                >
                  <option value="newest">{t("products.sort_newest")}</option>
                  <option value="price_asc">{t("products.sort_price_asc")}</option>
                  <option value="price_desc">{t("products.sort_price_desc")}</option>
                  <option value="name">{t("products.sort_name")}</option>
                  <option value="discount_asc">{t("products.discount_asc")}</option>
                  <option value="discount_desc">{t("products.discount_desc")}</option>
                </select>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentInStock}
                    onChange={(e) => router.push(buildUrl({ inStock: e.target.checked ? "true" : null }))}
                    className="h-4 w-4 accent-primary"
                  />
                  {t("products.availability")}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentNewArrivals}
                    onChange={(e) => router.push(buildUrl({ newArrivals: e.target.checked ? "true" : null }))}
                    className="h-4 w-4 accent-primary"
                  />
                  {t("products.new_arrivals")}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentOnSale}
                    onChange={(e) => router.push(buildUrl({ onSale: e.target.checked ? "true" : null }))}
                    className="h-4 w-4 accent-primary"
                  />
                  {t("products.on_sale")}
                </label>
              </div>

              {/* Clear */}
              {hasActiveFilters && (
                <button onClick={clearAll} className="w-full rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
                  {t("products.clear_filters")}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

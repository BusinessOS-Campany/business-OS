import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { X } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/motion-wrappers";
import { T } from "@/components/translate";
import { LocalizedName } from "@/components/localized";
import { getServerLocale } from "@/lib/i18n/server";
import { localizedName } from "@/lib/i18n/localized";
import { ProductFilters } from "@/components/shop/product-filters";
import { CategoryPills } from "@/components/shop/category-pills";
import { SwipeableProductCard } from "@/components/shop/swipeable-product-card";

export async function ProductsContent({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const locale = await getServerLocale();
  let sessionUserId: string | undefined;
  let isLoggedIn = false;
  try {
    const session = await auth();
    sessionUserId = (session?.user as any)?.id;
    isLoggedIn = !!sessionUserId;
  } catch { sessionUserId = undefined; isLoggedIn = false; }

  const where: any = {};
  const orderBy: any = { createdAt: "desc" };

  if (searchParams.featured === "true") where.featured = true;
  if (searchParams.category) where.category = { slug: searchParams.category };
  if (searchParams.q) {
    const q = searchParams.q;
    where.OR = [
      { name: { contains: q } },
      { nameEn: { contains: q } },
      { description: { contains: q } },
      { descriptionEn: { contains: q } },
    ];
  }
  if (searchParams.inStock === "true") where.stock = { gt: 0 };
  if (searchParams.minPrice || searchParams.maxPrice) {
    where.price = {};
    if (searchParams.minPrice) where.price.gte = parseFloat(searchParams.minPrice);
    if (searchParams.maxPrice) where.price.lte = parseFloat(searchParams.maxPrice);
  }
  if (searchParams.brand) where.brand = searchParams.brand;
  if (searchParams.color) where.colors = { has: searchParams.color };
  if (searchParams.size) where.sizes = { has: searchParams.size };
  if (searchParams.minRating) where.reviews = { some: { rating: { gte: parseInt(searchParams.minRating) } } };
  if (searchParams.newArrivals === "true") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    where.createdAt = { gte: thirtyDaysAgo };
  }
  if (searchParams.onSale === "true") where.discount = { gt: 0 };

  if (searchParams.sort === "price_asc") { orderBy.price = "asc"; delete orderBy.createdAt; }
  else if (searchParams.sort === "price_desc") { orderBy.price = "desc"; delete orderBy.createdAt; }
  else if (searchParams.sort === "name") { orderBy.name = "asc"; delete orderBy.createdAt; }
  else if (searchParams.sort === "discount_asc") { orderBy.discount = "asc"; delete orderBy.createdAt; }
  else if (searchParams.sort === "discount_desc") { orderBy.discount = "desc"; delete orderBy.createdAt; }

  const pageSize = 12;
  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const skip = (page - 1) * pageSize;

  const productSelect = { id: true, name: true, nameEn: true, slug: true, price: true, images: true, colors: true, sizes: true, featured: true, stock: true, discount: true, dealEnd: true, brand: true, brandLogo: true, createdAt: true, category: { select: { id: true, name: true, nameEn: true, slug: true } }, reviews: { select: { rating: true } } } as const;

  let products: any[] = [];
  let totalCount = 0;
  let categories: any[] = [];
  let uniqueBrands: string[] = [];
  let favoriteIds = new Set<string>();
  try {
    const [productRows, countRows, catRows, brandRows, userFavs] = await Promise.all([
      prisma.product.findMany({ where, select: productSelect, orderBy, take: pageSize, skip }),
      prisma.product.count({ where }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.$queryRawUnsafe<{ brand: string }[]>("SELECT DISTINCT brand FROM \"Product\" WHERE brand IS NOT NULL ORDER BY brand"),
      isLoggedIn ? prisma.favorite.findMany({ where: { userId: sessionUserId! }, select: { productId: true } }) : [],
    ]);
    products = productRows as any[];
    totalCount = countRows as number;
    categories = catRows as any[];
    uniqueBrands = Array.isArray(brandRows) ? brandRows.map((b: any) => b.brand).filter(Boolean) : [];
    favoriteIds = new Set(isLoggedIn ? (userFavs as any[]).map((f: any) => f.productId) : []);
  } catch { products = []; totalCount = 0; categories = []; uniqueBrands = []; favoriteIds = new Set(); }
  const totalPages = Math.ceil(totalCount / pageSize);

  let uniqueColors: string[] = [];
  let uniqueSizes: string[] = [];
  try {
    const colorRows = products.length > 0
      ? await prisma.product.findMany({ where: { colors: { isEmpty: false } }, select: { colors: true }, take: 100 })
      : [];
    const sizeRows = products.length > 0
      ? await prisma.product.findMany({ where: { sizes: { isEmpty: false } }, select: { sizes: true }, take: 100 })
      : [];
    uniqueColors = [...new Set(colorRows.flatMap((r: any) => r.colors))].sort();
    uniqueSizes = [...new Set(sizeRows.flatMap((r: any) => r.sizes))].sort();
  } catch { uniqueColors = []; uniqueSizes = []; }

  const productList = (products as any[]).map((p: any) => ({ ...p, price: Number(p.price) }));

  function filterUrl(overrides: Record<string, string | null | undefined>) {
    const p = new URLSearchParams();
    const preserveKeys = ["q", "category", "sort", "minPrice", "maxPrice", "inStock", "featured", "brand", "color", "size", "minRating", "newArrivals", "onSale", "page"];
    for (const key of preserveKeys) {
      if (searchParams[key] && !(key in overrides)) p.set(key, searchParams[key]!);
    }
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    }
    const qs = p.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  function activeFilterTag(label: string, param: string) {
    return (
      <Link
        key={param}
        href={filterUrl({ [param]: null })}
        className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-3 py-1 hover:bg-primary/20 transition-colors"
      >
        {label}
        <X className="h-3 w-3" />
      </Link>
    );
  }

  const activeTags: React.ReactNode[] = [];
  if (searchParams.q) activeTags.push(activeFilterTag(`"${searchParams.q}"`, "q"));
  if (searchParams.category) {
    const cat = categories.find((c: any) => c.slug === searchParams.category);
    if (cat) activeTags.push(activeFilterTag(localizedName(cat, locale), "category"));
  }
  if (searchParams.inStock === "true") activeTags.push(activeFilterTag(locale === "en" ? "In stock" : "متوفر", "inStock"));
  if (searchParams.featured === "true") activeTags.push(activeFilterTag(locale === "en" ? "Featured" : "مميز", "featured"));
  if (searchParams.minPrice) activeTags.push(activeFilterTag(`≥ ${searchParams.minPrice}`, "minPrice"));
  if (searchParams.maxPrice) activeTags.push(activeFilterTag(`≤ ${searchParams.maxPrice}`, "maxPrice"));
  if (searchParams.brand) activeTags.push(activeFilterTag(searchParams.brand, "brand"));
  if (searchParams.color) activeTags.push(activeFilterTag(searchParams.color, "color"));
  if (searchParams.size) activeTags.push(activeFilterTag(searchParams.size, "size"));
  if (searchParams.minRating) activeTags.push(activeFilterTag(`★${searchParams.minRating}+`, "minRating"));
  if (searchParams.newArrivals === "true") activeTags.push(activeFilterTag(locale === "en" ? "New" : "جديد", "newArrivals"));
  if (searchParams.onSale === "true") activeTags.push(activeFilterTag(locale === "en" ? "Sale" : "خصم", "onSale"));
  if (searchParams.sort && searchParams.sort !== "newest") {
    const sortLabels: Record<string, string> = {
      price_asc: locale === "en" ? "Price ↑" : "السعر ↑",
      price_desc: locale === "en" ? "Price ↓" : "السعر ↓",
      name: locale === "en" ? "Name" : "الاسم",
      discount_asc: locale === "en" ? "Discount ↑" : "الخصم ↑",
      discount_desc: locale === "en" ? "Discount ↓" : "الخصم ↓",
    };
    activeTags.push(activeFilterTag(sortLabels[searchParams.sort] || searchParams.sort, "sort"));
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {totalCount} <T k="products.search_count" />
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <ProductFilters categories={categories} brands={uniqueBrands} colors={uniqueColors} sizes={uniqueSizes} />
        {activeTags.length > 0 && (
          <Link href="/products" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            <T k="products.clear_filters" />
          </Link>
        )}
      </div>

      {activeTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">{activeTags}</div>
      )}

      <CategoryPills categories={categories as any[]} />

      <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {productList.map((p: any) => (
          <StaggerItem key={p.id}>
            <SwipeableProductCard product={p} isLoggedIn={isLoggedIn} favoriteIds={favoriteIds} />
          </StaggerItem>
        ))}
        {productList.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12"><T k="products.empty" /></p>
        )}
      </StaggerContainer>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8" dir="ltr">
          {page > 1 && (
            <Link
              href={filterUrl({ page: String(page - 1) })}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
            >
              ‹
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={filterUrl({ page: String(p) })}
              className={`inline-flex items-center justify-center h-9 min-w-[2.25rem] rounded-lg border transition-colors text-sm ${
                p === page
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link
              href={filterUrl({ page: String(page + 1) })}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
            >
              ›
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { T } from "@/components/translate";
import { SwipeableProductCard } from "@/components/shop/swipeable-product-card";
import { HeroSlider } from "@/components/shop/hero-slider";
import { localizedName } from "@/lib/i18n/localized";
import { getServerLocale } from "@/lib/i18n/server";
import { DealsSection } from "@/components/shop/deals-section";
import { getFeaturedProducts, getLatestProducts, getParentCategories, getBestSellers, getDealProducts, getActiveBanners } from "@/lib/data";
import type { Locale } from "@/lib/i18n/dictionary";

async function HeroSection() {
  const banners = await getActiveBanners();
  return <HeroSlider slides={banners} />;
}

async function CategoriesSection({ locale }: { locale: Locale }) {
  const categories = await getParentCategories();
  if (categories.length === 0) return null;
  return (
    <section className="bg-white rounded-2xl p-4 sm:p-5 dark:bg-card lg:-mx-8 lg:px-8 lg:rounded-none">
      <h2 className="text-lg font-bold mb-5 lg:mb-8"><T k="categories.title" /></h2>
      <div className="grid grid-flow-col grid-rows-3 gap-x-6 gap-y-3 overflow-x-auto pb-1 lg:gap-x-12 lg:gap-y-5" style={{ scrollbarWidth: 'none' }}>
        {(categories as any[]).map((cat: any) => (
          <Link key={cat.id} href={`/categories?parent=${cat.slug}`} className="text-center group">
            <div className="w-[70px] h-[70px] rounded-[25px] overflow-hidden mx-auto transition-transform duration-300 group-hover:scale-105 max-sm:w-[60px] max-sm:h-[60px] relative">
              {cat.image ? (
                <Image src={cat.image} alt={cat.name} fill className="object-cover" sizes="70px" />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
            </div>
            <p className="mt-2 text-sm leading-tight text-[#222] dark:text-foreground">
              {localizedName(cat, locale)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

async function FeaturedSection({ favoriteIds, isLoggedIn }: { favoriteIds: Set<string>; isLoggedIn: boolean }) {
  const rawFeatured = await getFeaturedProducts();
  if (rawFeatured.length === 0) return null;
  const featured = (rawFeatured as any[]).map((p: any) => ({ ...p, price: Number(p.price) }));
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold"><T k="home.featured" /></h2>
        <Link href="/products?featured=true" className="text-sm text-primary hover:underline"><T k="home.view_all" /></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {featured.map((p: any) => (
          <SwipeableProductCard key={p.id} product={p} isLoggedIn={isLoggedIn} favoriteIds={favoriteIds} />
        ))}
      </div>
    </section>
  );
}

async function BestSellersSection({ favoriteIds, isLoggedIn }: { favoriteIds: Set<string>; isLoggedIn: boolean }) {
  const bestSellers = await getBestSellers();
  if (bestSellers.length === 0) return null;
  const bestList = (bestSellers as any[]).map((p: any) => ({ ...p, price: Number(p.price) }));
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold"><T k="home.best_seller" /></h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {bestList.map((p: any) => (
          <SwipeableProductCard key={p.id} product={p} isLoggedIn={isLoggedIn} favoriteIds={favoriteIds} />
        ))}
      </div>
    </section>
  );
}

async function LatestSection({ favoriteIds, isLoggedIn }: { favoriteIds: Set<string>; isLoggedIn: boolean }) {
  const rawLatest = await getLatestProducts();
  const latest = (rawLatest as any[]).map((p: any) => ({ ...p, price: Number(p.price) }));
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold"><T k="home.latest" /></h2>
        <Link href="/products" className="text-sm text-primary hover:underline"><T k="home.view_all" /></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {latest.map((p: any) => (
          <SwipeableProductCard key={p.id} product={p} isLoggedIn={isLoggedIn} favoriteIds={favoriteIds} />
        ))}
      </div>
    </section>
  );
}

async function DealsSectionWrapper({ favoriteIds, isLoggedIn }: { favoriteIds: Set<string>; isLoggedIn: boolean }) {
  const rawDeals = await getDealProducts();
  if (rawDeals.length === 0) return null;
  const deals = (rawDeals as any[]).map((p: any) => ({ ...p, price: Number(p.price) }));
  const nextMidnight = new Date();
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);
  return <DealsSection products={deals} target={nextMidnight.toISOString()} isLoggedIn={isLoggedIn} favoriteIds={favoriteIds} />;
}

function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function HomePageContent() {
  let session: any = null;
  try { session = await auth(); } catch { session = null; }
  const sessionUserId = (session?.user as any)?.id;
  const isLoggedIn = !!sessionUserId;
  const locale = await getServerLocale();

  let favoriteIds = new Set<string>();
  if (isLoggedIn) {
    try {
      const userFavs = await prisma.favorite.findMany({ where: { userId: sessionUserId }, select: { productId: true } });
      favoriteIds = new Set((userFavs as any[]).map((f: any) => f.productId));
    } catch { /* ignore */ }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      <Suspense fallback={<div className="h-[200px] bg-muted animate-pulse rounded-2xl" />}>
        <CategoriesSection locale={locale} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <DealsSectionWrapper favoriteIds={favoriteIds} isLoggedIn={isLoggedIn} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <FeaturedSection favoriteIds={favoriteIds} isLoggedIn={isLoggedIn} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <BestSellersSection favoriteIds={favoriteIds} isLoggedIn={isLoggedIn} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <LatestSection favoriteIds={favoriteIds} isLoggedIn={isLoggedIn} />
      </Suspense>
    </div>
  );
}

export default async function HomePage() {
  return (
    <>
      <Suspense fallback={<div className="h-[300px] bg-muted animate-pulse rounded-2xl mx-4 mt-4" />}>
        <HeroSection />
      </Suspense>
      <Suspense fallback={<div className="h-96 bg-muted animate-pulse mx-4 rounded-2xl" />}>
        <HomePageContent />
      </Suspense>
    </>
  );
}

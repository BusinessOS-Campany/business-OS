import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/server";
import { localizedName, localizedDescription } from "@/lib/i18n/localized";
import { T } from "@/components/translate";
import { LocalizedName } from "@/components/localized";
import { SwipeableProductCard } from "@/components/shop/swipeable-product-card";
import { FadeIn, FadeInUp, StaggerContainer, StaggerItem } from "@/components/motion-wrappers";
import { StoreHeader } from "@/components/shop/store-header";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getServerLocale();
  let sessionUserId: string | undefined;
  try {
    const session = await auth();
    sessionUserId = (session?.user as any)?.id;
  } catch { sessionUserId = undefined; }

  let store: any = null;
  let products: any[] = [];
  let favSet = new Set<string>();
  try {
    store = await prisma.store.findUnique({
      where: { slug },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    if (!store) notFound();

    products = await prisma.product.findMany({
      where: { userId: store.userId, stock: { gt: 0 } },
      select: {
        id: true, name: true, nameEn: true, slug: true, price: true, images: true,
        colors: true, sizes: true, featured: true, stock: true, discount: true,
        dealEnd: true, brand: true, brandLogo: true, createdAt: true,
        category: { select: { id: true, name: true, nameEn: true, slug: true } },
        reviews: { select: { rating: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const userFavs = sessionUserId
      ? await prisma.favorite.findMany({ where: { userId: sessionUserId }, select: { productId: true } })
      : [];
    favSet = new Set(userFavs.map((f) => f.productId));
  } catch { store = null; products = []; favSet = new Set(); }

  return (
    <FadeIn>
      <StoreHeader store={store as any} locale={locale} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <FadeInUp>
          <h2 className="text-xl font-bold mb-6">منتجات المتجر</h2>
        </FadeInUp>
        {products.length === 0 ? (
          <p className="text-muted-foreground">لا توجد منتجات في هذا المتجر حالياً</p>
        ) : (
          <StaggerContainer>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {products.map((product) => (
                <StaggerItem key={product.id}>
                  <SwipeableProductCard
                    product={{ ...product, price: Number(product.price) }}
                    isLoggedIn={!!sessionUserId}
                    favoriteIds={favSet}
                  />
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        )}
      </div>
    </FadeIn>
  );
}

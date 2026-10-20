import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Heart, ArrowLeft } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion-wrappers";
import { SwipeableProductCard } from "@/components/shop/swipeable-product-card";
import { T } from "@/components/translate";
import { auth } from "@/lib/auth";

export default async function SharedWishlistPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  let isLoggedIn = false;
  let sessionUserId: string | undefined;
  try {
    const session = await auth();
    sessionUserId = (session?.user as any)?.id;
    isLoggedIn = !!sessionUserId;
  } catch { sessionUserId = undefined; isLoggedIn = false; }

  let user: { name: string | null } | null = null;
  let productList: any[] = [];
  let currentFavs: string[] = [];
  try {
    user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (!user) notFound();

    const userFavs = await prisma.favorite.findMany({
      where: { userId },
      select: { productId: true },
    });
    const favIds = new Set(userFavs.map((f) => f.productId));

    const products = await prisma.product.findMany({
      where: { id: { in: [...favIds] } },
      select: {
        id: true, name: true, nameEn: true, slug: true, price: true,
        images: true, colors: true, featured: true, stock: true, discount: true, dealEnd: true,
        brand: true, brandLogo: true,
        category: { select: { id: true, name: true, nameEn: true, slug: true } },
        reviews: { select: { rating: true } },
      },
    });
    productList = products.map((p) => ({ ...p, price: Number(p.price) }));

    if (isLoggedIn) {
      const myFavs = await prisma.favorite.findMany({ where: { userId: sessionUserId! }, select: { productId: true } });
      currentFavs = myFavs.map((f) => f.productId);
    }
  } catch { user = null; productList = []; currentFavs = []; }

  if (!user) notFound();

  return (
    <FadeIn>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-rose-500" />
            <h1 className="text-2xl font-bold">
              {user.name || ""} / <T k="favorites.shared_title" />
            </h1>
            {productList.length > 0 && (
              <span className="text-sm text-muted-foreground">({productList.length})</span>
            )}
          </div>
          <Link href="/products" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            <T k="favorites.browse" />
          </Link>
        </div>

        {productList.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground/30" />
            <p className="text-lg text-muted-foreground mt-4"><T k="favorites.shared_empty" /></p>
          </div>
        ) : (
          <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {productList.map((p: any) => (
              <StaggerItem key={p.id}>
                <SwipeableProductCard product={p} isLoggedIn={isLoggedIn} favoriteIds={new Set(currentFavs)} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </FadeIn>
  );
}

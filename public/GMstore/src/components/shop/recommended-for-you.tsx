import { prisma } from "@/lib/prisma";
import { SwipeableProductCard } from "@/components/shop/swipeable-product-card";

const productSelect = {
  id: true, name: true, nameEn: true, slug: true, price: true,
  images: true, colors: true, featured: true, stock: true, discount: true, dealEnd: true,
} as const;

export async function RecommendedForYou({ userId, isLoggedIn, favoriteIds }: { userId?: string; isLoggedIn: boolean; favoriteIds: Set<string> }) {
  if (!userId) return null;

  const [favCats, orderCats] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId },
      select: { product: { select: { categoryId: true } } },
      take: 10,
    }),
    prisma.order.findMany({
      where: { userId },
      select: { items: { select: { product: { select: { categoryId: true } } } } },
      take: 10,
    }),
  ]);

  const catIds = new Set([
    ...favCats.map((f) => f.product.categoryId).filter((id): id is string => !!id),
    ...orderCats.flatMap((o) => o.items.map((i) => i.product.categoryId).filter((id): id is string => !!id)),
  ]);

  if (catIds.size === 0) return null;

  const excludeIds = [...favoriteIds];

  const products = await prisma.product.findMany({
    where: { categoryId: { in: [...catIds] }, id: { notIn: excludeIds } },
    select: productSelect,
    take: 8,
    orderBy: { createdAt: "desc" },
  });

  if (products.length === 0) return null;

  const mapped = products.map((p: any) => ({ ...p, price: Number(p.price) }));

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">موصى به لك</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {mapped.map((p: any) => (
          <SwipeableProductCard key={p.id} product={p} isLoggedIn={isLoggedIn} favoriteIds={favoriteIds} />
        ))}
      </div>
    </section>
  );
}

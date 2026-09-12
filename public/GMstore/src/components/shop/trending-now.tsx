import { prisma } from "@/lib/prisma";
import { SwipeableProductCard } from "@/components/shop/swipeable-product-card";

const productSelect = {
  id: true, name: true, nameEn: true, slug: true, price: true,
  images: true, colors: true, featured: true, stock: true, discount: true, dealEnd: true,
} as const;

export async function TrendingNow({ isLoggedIn, favoriteIds }: { isLoggedIn: boolean; favoriteIds: Set<string> }) {
  const top = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 8,
  });
  const ids = top.map((t) => t.productId);
  if (ids.length === 0) return null;

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: productSelect,
  });
  const sorted = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const mapped = sorted.map((p: any) => ({ ...p, price: Number(p.price) }));

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">الأكثر رواجاً الآن</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {mapped.map((p: any) => (
          <SwipeableProductCard key={p.id} product={p} isLoggedIn={isLoggedIn} favoriteIds={favoriteIds} />
        ))}
      </div>
    </section>
  );
}

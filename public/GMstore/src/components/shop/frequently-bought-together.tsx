import { prisma } from "@/lib/prisma";
import { SwipeableProductCard } from "@/components/shop/swipeable-product-card";

const productSelect = {
  id: true, name: true, nameEn: true, slug: true, price: true,
  images: true, colors: true, featured: true, stock: true, discount: true, dealEnd: true,
} as const;

export async function FrequentlyBoughtTogether({ productId, isLoggedIn, favoriteIds }: { productId: string; isLoggedIn: boolean; favoriteIds: Set<string> }) {
  const orders = await prisma.orderItem.findMany({
    where: { productId },
    select: { orderId: true },
    take: 50,
  });
  const orderIds = [...new Set(orders.map((o) => o.orderId))];
  if (orderIds.length === 0) return null;

  const siblings = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { orderId: { in: orderIds }, productId: { not: productId } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 4,
  });

  const sibIds = siblings.map((s) => s.productId);
  if (sibIds.length === 0) return null;

  const products = await prisma.product.findMany({
    where: { id: { in: sibIds } },
    select: productSelect,
  });

  const sorted = sibIds.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const mapped = sorted.map((p: any) => ({ ...p, price: Number(p.price) }));

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">يشترى معًا عادة</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {mapped.map((p: any) => (
          <SwipeableProductCard key={p.id} product={p} isLoggedIn={isLoggedIn} favoriteIds={favoriteIds} />
        ))}
      </div>
    </section>
  );
}

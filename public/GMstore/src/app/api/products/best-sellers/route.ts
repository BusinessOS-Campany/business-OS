import { prisma } from "@/lib/prisma";

export async function GET() {
  const best = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 8,
  });

  const ids = best.map((b) => b.productId);
  if (ids.length === 0) return Response.json([]);

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, name: true, nameEn: true, slug: true, price: true,
      images: true, colors: true, featured: true, stock: true, discount: true, dealEnd: true,
      brand: true, brandLogo: true,
      category: { select: { id: true, name: true, nameEn: true, slug: true } },
      reviews: { select: { rating: true } },
    },
  });

  const sorted = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  return Response.json(sorted.map((p: any) => ({ ...p, price: Number(p.price) })));
}

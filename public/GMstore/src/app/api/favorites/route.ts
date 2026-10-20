import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req) => {
  if (!req.auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = (req.auth.user as any).id;
  const favs = await prisma.favorite.findMany({
    where: { userId },
    select: {
      product: {
        select: {
          id: true, name: true, nameEn: true, slug: true, price: true,
          images: true, colors: true, stock: true, discount: true, dealEnd: true,
          brand: true, brandLogo: true,
          category: { select: { id: true, name: true, nameEn: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const products = favs.map((f) => f.product);
  const ids = products.map((p) => p.id);
  const reviewStats = ids.length > 0
    ? await prisma.review.groupBy({
        by: ["productId"],
        where: { productId: { in: ids } },
        _avg: { rating: true },
        _count: true,
      })
    : [];
  const statsMap = new Map(reviewStats.map((s) => [s.productId, { avg: s._avg.rating || 0, count: s._count }]));
  const result = products.map((p: any) => ({
    ...p,
    _avgRating: statsMap.get(p.id)?.avg || 0,
    _reviewCount: statsMap.get(p.id)?.count || 0,
    price: Number(p.price),
  }));
  return NextResponse.json(result);
});

export const POST = auth(async (req) => {
  if (!req.auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = (req.auth.user as any).id;
  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId مطلوب" }, { status: 400 });
  const existing = await prisma.favorite.findUnique({ where: { userId_productId: { userId, productId } } });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }
  await prisma.favorite.create({ data: { userId, productId } });
  return NextResponse.json({ favorited: true });
});

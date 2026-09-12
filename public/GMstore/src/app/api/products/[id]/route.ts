import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      category: true,
      reviews: { include: { user: { select: { id: true, name: true, image: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const reviewStats = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: product.id },
    _avg: { rating: true },
    _count: true,
  });
  const stats = reviewStats[0] || {};
  return NextResponse.json({
    ...product,
    price: Number(product.price),
    _avgRating: (stats._avg as any)?.rating || 0,
    _reviewCount: (stats as any)?._count || 0,
    reviews: product.reviews.map((r: any) => ({ ...r, rating: Number(r.rating) })),
  });
}

export const PATCH = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (!req.auth || (role !== "ADMIN" && role !== "MERCHANT")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
  if (role !== "ADMIN" && product.userId !== userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const body = await req.json();
  let slug = (body.slug ?? "").normalize("NFC").toLowerCase();
  const slugConflict = await prisma.product.findUnique({ where: { slug } });
  if (slugConflict && slugConflict.id !== id) slug = `${slug}-${userId.slice(0, 8)}`;
  const updated = await prisma.product.update({
    where: { id },
      data: {
        name: body.name,
        nameEn: body.nameEn || null,
        slug,
        description: body.description,
        descriptionEn: body.descriptionEn || null,
        price: parseFloat(body.price),
        categoryId: body.categoryId || null,
        stock: parseInt(body.stock) || 0,
        discount: parseInt(body.discount) || 0,
        dealEnd: body.dealEnd ? new Date(body.dealEnd) : null,
        featured: body.featured ?? false,
        images: body.images ?? [],
        colors: body.colors ?? [],
        colorImages: body.colorImages ?? undefined,
        colorStock: body.colorStock ?? undefined,
        brand: body.brand || null,
        brandLogo: body.brandLogo || null,
        specs: body.specs ?? undefined,
        videoUrl: body.videoUrl || null,
        sizes: body.sizes ?? [],
      },
  });
  return NextResponse.json(updated);
});

export const DELETE = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (!req.auth || (role !== "ADMIN" && role !== "MERCHANT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "ADMIN" && product.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.orderItem.deleteMany({ where: { productId: id } });
  await prisma.favorite.deleteMany({ where: { productId: id } });
  await prisma.review.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");

    const listSelect = {
      id: true, name: true, nameEn: true, slug: true, price: true,
      images: true, colors: true, colorImages: true, colorStock: true, stock: true, discount: true, dealEnd: true, featured: true,
      description: true, descriptionEn: true, brand: true, brandLogo: true,
      category: { select: { id: true, name: true, nameEn: true, slug: true } },
    } as const;

    if (search) {
      const products = await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { nameEn: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { descriptionEn: { contains: search, mode: "insensitive" } },
          ],
        },
        select: listSelect,
        take: Math.min(limit, 50),
      });
      return NextResponse.json(products.map((p: any) => ({ ...p, price: Number(p.price) })), {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
      });
    }

    const products = await prisma.product.findMany({
      where: ids ? { id: { in: ids.split(",").filter(Boolean) } } : undefined,
      select: listSelect,
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    const allIds = products.map((p) => p.id);
    const reviewStats = allIds.length > 0
      ? await prisma.review.groupBy({
          by: ["productId"],
          where: { productId: { in: allIds } },
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
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
};

export const POST = auth(async (req) => {
  try {
    const role = (req.auth?.user as any)?.role;
    if (!req.auth || (role !== "ADMIN" && role !== "MERCHANT")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const body = await req.json();
    const userId = (req.auth.user as any).id;

    if (!body.categoryId) {
      return NextResponse.json({ error: "يرجى اختيار فئة" }, { status: 400 });
    }

    let slug = (body.slug ?? "").normalize("NFC").toLowerCase();
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const product = await prisma.product.create({
      data: {
        name: body.name,
        nameEn: body.nameEn || null,
        slug,
        description: body.description,
        descriptionEn: body.descriptionEn || null,
        price: parseFloat(body.price),
        categoryId: body.categoryId || null,
        userId,
        stock: parseInt(body.stock) || 0,
        discount: parseInt(body.discount) || 0,
        dealEnd: body.dealEnd ? new Date(body.dealEnd) : null,
        featured: body.featured ?? false,
        images: body.images ?? [],
        colors: body.colors ?? [],
        colorImages: body.colorImages ?? undefined,
        colorStock: body.colorStock ?? undefined,
        sizes: body.sizes ?? [],
        brand: body.brand || null,
        brandLogo: body.brandLogo || null,
        specs: body.specs ?? undefined,
        videoUrl: body.videoUrl || null,
      },
    });
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "فشل إنشاء المنتج" }, { status: 500 });
  }
});

export const PATCH = auth(async (req) => {
  try {
    const role = (req.auth?.user as any)?.role;
    const userId = (req.auth?.user as any)?.id;
    if (!req.auth || (role !== "ADMIN" && role !== "MERCHANT")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const body = await req.json();
    const product = await prisma.product.findUnique({ where: { id: body.id } });
    if (!product) return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    if (role !== "ADMIN" && product.userId !== userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    let slug = (body.slug ?? "").normalize("NFC").toLowerCase();
    const slugConflict = await prisma.product.findUnique({ where: { slug } });
    if (slugConflict && slugConflict.id !== body.id) slug = `${slug}-${Date.now()}`;
    const updated = await prisma.product.update({
      where: { id: body.id },
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
        sizes: body.sizes ?? [],
        brand: body.brand || null,
        brandLogo: body.brandLogo || null,
        specs: body.specs ?? undefined,
        videoUrl: body.videoUrl || null,
      },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "فشل تحديث المنتج" }, { status: 500 });
  }
});

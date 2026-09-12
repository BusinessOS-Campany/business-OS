import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 20);

  if (q.length < 1) return NextResponse.json([]);

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { nameEn: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { category: { nameEn: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true, name: true, nameEn: true, slug: true, price: true,
      images: true, discount: true, dealEnd: true,
      category: { select: { name: true, nameEn: true, slug: true } },
    },
    take: limit,
  });

  return NextResponse.json(products.map(p => ({ ...p, price: Number(p.price) })));
};

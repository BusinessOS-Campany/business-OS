import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean) || [];
  if (ids.length === 0) return Response.json([]);

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, name: true, nameEn: true, slug: true, price: true,
      images: true, colors: true, sizes: true, stock: true, discount: true, dealEnd: true,
      brand: true, description: true, descriptionEn: true,
      category: { select: { id: true, name: true, nameEn: true } },
      reviews: { select: { rating: true } },
    },
  });

  return Response.json(products.map((p) => ({ ...p, price: Number(p.price) })));
}

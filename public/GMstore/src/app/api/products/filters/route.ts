import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const GET = async () => {
  try {
    const [brands, colorRows, sizeRows] = await Promise.all([
      prisma.$queryRawUnsafe<{ brand: string }[]>("SELECT DISTINCT brand FROM \"Product\" WHERE brand IS NOT NULL ORDER BY brand"),
      prisma.product.findMany({ where: { colors: { isEmpty: false } }, select: { colors: true }, take: 100 }),
      prisma.product.findMany({ where: { sizes: { isEmpty: false } }, select: { sizes: true }, take: 100 }),
    ]);
    const uniqueBrands = Array.isArray(brands) ? brands.map((b: any) => b.brand).filter(Boolean) : [];
    const uniqueColors = [...new Set((colorRows as any[]).flatMap((r: any) => r.colors))].sort();
    const uniqueSizes = [...new Set((sizeRows as any[]).flatMap((r: any) => r.sizes))].sort();
    return NextResponse.json({ brands: uniqueBrands, colors: uniqueColors, sizes: uniqueSizes });
  } catch {
    return NextResponse.json({ brands: [], colors: [], sizes: [] });
  }
};

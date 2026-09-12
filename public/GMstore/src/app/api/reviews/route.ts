import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const reviews = await prisma.review.findMany({
    include: {
      product: { select: { id: true, name: true, nameEn: true, images: true, slug: true } },
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reviews.map((r) => ({ ...r, rating: Number(r.rating) })));
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (role !== "MERCHANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reported = searchParams.get("reported");

  const merchantProductIds = await prisma.product.findMany({
    where: { userId },
    select: { id: true },
  });
  const productIds = merchantProductIds.map((p) => p.id);

  const where: any = { productId: { in: productIds } };
  if (reported === "true") where.reported = true;
  if (reported === "false") where.reported = false;

  const reviews = await prisma.review.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, nameEn: true, images: true } },
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
});

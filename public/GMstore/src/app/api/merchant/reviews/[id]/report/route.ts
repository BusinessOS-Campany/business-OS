import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const POST = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (role !== "MERCHANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const review = await prisma.review.findUnique({
    where: { id },
    include: { product: { select: { userId: true } } },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  if (review.product.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { reported: true },
  });

  return NextResponse.json(updated);
});

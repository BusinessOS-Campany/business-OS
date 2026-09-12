import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reviews = await prisma.review.findMany({
    where: { productId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { rating, comment } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "التقييم يجب أن يكون بين 1 و 5" }, { status: 400 });
  }

  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId: id, userId: (session.user as any).id } },
  });
  if (existing) {
    return NextResponse.json({ error: "قمت بتقييم هذا المنتج مسبقاً" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      productId: id,
      userId: (session.user as any).id,
      rating: Number(rating),
      comment,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(review);
}

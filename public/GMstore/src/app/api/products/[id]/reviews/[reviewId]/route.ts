import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const PATCH = auth(async (req, { params }: { params: Promise<{ id: string; reviewId: string }> }) => {
  const session = req.auth;
  if (!session?.user) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const { reviewId } = await params;
  const body = await req.json();
  const { rating, comment } = body;

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });
  if (review.userId !== (session.user as any).id) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { rating: rating !== undefined ? Number(rating) : review.rating, comment },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(updated);
});

export const DELETE = auth(async (req, { params }: { params: Promise<{ id: string; reviewId: string }> }) => {
  const session = req.auth;
  if (!session?.user) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const { reviewId } = await params;
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });
  if (review.userId !== (session.user as any).id) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  await prisma.review.delete({ where: { id: reviewId } });
  return NextResponse.json({ success: true });
});

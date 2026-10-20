import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const isAdmin = (role: string) => role === "ADMIN";
const isMerchant = (role: string) => role === "MERCHANT";

export const PATCH = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const session = req.auth;
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  if (!session || !isAdmin(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { reply, rating, comment } = body;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const data: any = {};
  if (reply !== undefined) data.reply = reply;
  if (rating !== undefined) data.rating = Number(rating);
  if (comment !== undefined) data.comment = comment;

  const updated = await prisma.review.update({
    where: { id },
    data,
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true, nameEn: true } },
    },
  });

  return NextResponse.json(updated);
});

export const DELETE = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const role = (req.auth?.user as any)?.role;
  if (!req.auth || !isAdmin(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ success: true });
});

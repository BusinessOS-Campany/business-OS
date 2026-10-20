import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.product.deleteMany();
  return NextResponse.json({ success: true });
}

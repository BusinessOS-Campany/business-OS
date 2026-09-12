import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ message: "استخدم POST" });
}

export async function POST() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    return NextResponse.json({ success: true, message: "تم حذف جميع المنتجات والفئات" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

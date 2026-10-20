import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { searchParams } = new URL(req.url);
  const subtotal = parseFloat(searchParams.get("subtotal") || "0");

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon) return NextResponse.json({ error: "كوبون غير صالح", valid: false }, { status: 404 });
  if (!coupon.active) return NextResponse.json({ error: "الكوبون غير نشط", valid: false }, { status: 400 });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return NextResponse.json({ error: "الكوبون منتهي الصلاحية", valid: false }, { status: 400 });
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return NextResponse.json({ error: "تم استخدام الكوبون لأقصى عدد مرات", valid: false }, { status: 400 });
  if (coupon.minAmount && subtotal < Number(coupon.minAmount)) return NextResponse.json({ valid: false, error: `الحد الأدنى للطلب: ${Number(coupon.minAmount)} ريال`, minAmount: Number(coupon.minAmount) }, { status: 400 });

  return NextResponse.json({ valid: true, discount: coupon.discount, code: coupon.code, minAmount: coupon.minAmount ? Number(coupon.minAmount) : null });
}

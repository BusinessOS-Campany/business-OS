import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  if (!req.auth || role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(coupons);
});

export const POST = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  if (!req.auth || role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const coupon = await prisma.coupon.create({
    data: {
      code: body.code.toUpperCase(),
      discount: parseInt(body.discount),
      maxUses: parseInt(body.maxUses) || 0,
      minAmount: body.minAmount ? parseFloat(body.minAmount) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      active: body.active ?? true,
    },
  });
  return NextResponse.json(coupon);
});

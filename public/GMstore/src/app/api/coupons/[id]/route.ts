import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const PATCH = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const role = (req.auth?.user as any)?.role;
  if (!req.auth || role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: any = {};
  if (body.code) data.code = body.code.toUpperCase();
  if (body.discount !== undefined) data.discount = parseInt(body.discount);
  if (body.maxUses !== undefined) data.maxUses = parseInt(body.maxUses);
  if (body.minAmount !== undefined) data.minAmount = body.minAmount ? parseFloat(body.minAmount) : null;
  if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (body.active !== undefined) data.active = body.active;
  const updated = await prisma.coupon.update({ where: { id }, data });
  return NextResponse.json(updated);
});

export const DELETE = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const role = (req.auth?.user as any)?.role;
  if (!req.auth || role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ success: true });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  if (!req.auth || role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalUsers = await prisma.user.count();
  const totalOrders = await prisma.order.count();
  const totalProducts = await prisma.product.count();
  const monthOrders = await prisma.order.count({ where: { createdAt: { gte: monthStart } } });
  const monthRevenue = await prisma.order.aggregate({
    where: { createdAt: { gte: monthStart }, status: { not: "CANCELLED" } },
    _sum: { total: true },
  });
  return NextResponse.json({
    totalUsers,
    totalOrders,
    totalProducts,
    monthOrders,
    monthRevenue: Number(monthRevenue._sum.total || 0),
  });
});

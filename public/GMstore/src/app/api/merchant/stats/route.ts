import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (!req.auth || role !== "MERCHANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalProducts = await prisma.product.count({ where: { userId } });
  const publishedProducts = await prisma.product.count({ where: { userId, stock: { gt: 0 } } });
  const lowStock = await prisma.product.count({ where: { userId, stock: { lt: 5 } } });

  const orderItems = await prisma.orderItem.findMany({
    where: { product: { userId } },
    include: { order: true, product: true },
  });

  // Exclude cancelled orders and cancelled items
  const activeItems = orderItems.filter(
    (i) => i.order.status !== "CANCELLED" && i.status !== "CANCELLED",
  );

  const orderIds = [...new Set(activeItems.map((i) => i.orderId))];
  const totalOrders = orderIds.length;

  const todayItems = activeItems.filter((i) => i.order.createdAt >= todayStart);
  const monthItems = activeItems.filter((i) => i.order.createdAt >= monthStart);

  const newOrdersToday = [...new Set(todayItems.map((i) => i.orderId))].length;
  const newOrdersThisMonth = [...new Set(monthItems.map((i) => i.orderId))].length;

  const totalRevenue = activeItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const revenueToday = todayItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const revenueThisMonth = monthItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  const productSales: Record<string, { name: string; nameEn: string | null; count: number }> = {};
  for (const item of activeItems) {
    if (!productSales[item.productId]) {
      productSales[item.productId] = { name: item.product.name, nameEn: item.product.nameEn, count: 0 };
    }
    productSales[item.productId].count += item.quantity;
  }
  const bestSelling = Object.entries(productSales)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const salesByDay: { date: string; orders: number; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayItems = activeItems.filter(
      (item) => item.order.createdAt >= dayStart && item.order.createdAt < dayEnd,
    );
    const dayOrders = [...new Set(dayItems.map((i) => i.orderId))];
    salesByDay.push({
      date: dayStart.toISOString().slice(0, 10),
      orders: dayOrders.length,
      revenue: dayItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0),
    });
  }

  const feesTotal = Math.round(totalRevenue * 0.02 * 100) / 100;

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId, status: "COMPLETED" },
  });
  const withdrawnAmount = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
  const withdrawableBalance = Math.round((totalRevenue - feesTotal - withdrawnAmount) * 100) / 100;

  return NextResponse.json({
    totalProducts,
    publishedProducts,
    lowStock,
    totalOrders,
    newOrdersToday,
    newOrdersThisMonth,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    revenueToday: Math.round(revenueToday * 100) / 100,
    revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
    bestSelling,
    salesByDay,
    feesTotal,
    withdrawableBalance,
  });
});

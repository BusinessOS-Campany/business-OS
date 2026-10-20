import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const role = (req.auth?.user as any)?.role;
  if (!req.auth || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const merchant = await prisma.user.findUnique({
    where: { id, role: "MERCHANT" },
    select: {
      id: true, name: true, email: true, image: true, points: true,
      referralCode: true, createdAt: true,
      store: true,
      _count: { select: { products: true, reviews: true, withdrawals: true } },
    },
  });
  if (!merchant) return NextResponse.json({ error: "التاجر غير موجود" }, { status: 404 });

  const products = await prisma.product.findMany({
    where: { userId: id },
    include: {
      category: { select: { id: true, name: true, nameEn: true } },
      orderItems: { where: { order: { status: { not: "CANCELLED" } }, status: { not: "CANCELLED" } } },
      reviews: { select: { rating: true } },
      _count: { select: { favorites: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const productsWithSales = products.map((p) => ({
    id: p.id, name: p.name, nameEn: p.nameEn, slug: p.slug, price: Number(p.price),
    images: p.images, stock: p.stock, discount: p.discount, featured: p.featured,
    createdAt: p.createdAt,
    category: p.category,
    totalSold: p.orderItems.reduce((sum, oi) => sum + oi.quantity, 0),
    revenue: p.orderItems.reduce((sum, oi) => sum + Number(oi.price) * oi.quantity, 0),
    avgRating: p.reviews.length ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 0,
    reviewCount: p.reviews.length,
    favoriteCount: p._count.favorites,
  }));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const last6Months: { start: Date; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6Months.push({
      start: d,
      label: d.toLocaleDateString("ar-SA", { month: "long", year: "numeric" }),
    });
  }

  const orderItems = await prisma.orderItem.findMany({
    where: { product: { userId: id }, order: { status: { not: "CANCELLED" } }, status: { not: "CANCELLED" } },
    include: { order: { select: { id: true, status: true, createdAt: true, customerName: true, total: true } } },
  });

  const totalRevenue = Math.round(orderItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0) * 100) / 100;
  const platformFees = Math.round(totalRevenue * 0.02 * 100) / 100;

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: id, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
  });
  const withdrawnAmount = Math.round(withdrawals.reduce((s, w) => s + Number(w.amount), 0) * 100) / 100;
  const withdrawableBalance = Math.round((totalRevenue - platformFees - withdrawnAmount) * 100) / 100;

  const orderIds = [...new Set(orderItems.map((i) => i.orderId))];

  const monthlySales = last6Months.map((m) => {
    const nextMonth = new Date(m.start.getFullYear(), m.start.getMonth() + 1, 1);
    const monthItems = orderItems.filter((i) => i.order.createdAt >= m.start && i.order.createdAt < nextMonth);
    const monthOrders = [...new Set(monthItems.map((i) => i.orderId))];
    return {
      month: m.label,
      orders: monthOrders.length,
      revenue: Math.round(monthItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0) * 100) / 100,
    };
  });

  const pendingWithdrawals = await prisma.withdrawal.findMany({
    where: { userId: id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const recentOrders = await prisma.order.findMany({
    where: {
      id: { in: orderIds.slice(0, 20) },
      status: { not: "CANCELLED" },
    },
    include: {
      items: {
        where: { product: { userId: id } },
        select: { id: true, quantity: true, price: true, product: { select: { id: true, name: true, nameEn: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    merchant: {
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      image: merchant.image,
      points: merchant.points,
      referralCode: merchant.referralCode,
      registeredAt: merchant.createdAt,
    },
    store: merchant.store,
    stats: {
      totalProducts: merchant._count.products,
      totalReviews: merchant._count.reviews,
      totalOrders: orderIds.length,
      totalRevenue,
      platformFees,
      withdrawnAmount,
      withdrawableBalance,
      totalWithdrawals: merchant._count.withdrawals,
    },
    products: productsWithSales,
    withdrawals,
    pendingWithdrawals,
    monthlySales,
    recentOrders,
  });
});

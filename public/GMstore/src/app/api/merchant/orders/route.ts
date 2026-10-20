import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (role !== "MERCHANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const skip = parseInt(searchParams.get("skip") || String((page - 1) * 20));
  const take = parseInt(searchParams.get("take") || "20");
  const status = searchParams.get("status");
  const cancelled = searchParams.get("cancelled") === "true";

  const productIds = await prisma.product.findMany({
    where: { userId },
    select: { id: true },
  });
  const ids = productIds.map((p) => p.id);

  const where: any = { items: { some: { productId: { in: ids } } } };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          where: { productId: { in: ids } },
          include: { product: { select: { id: true, name: true, nameEn: true, images: true, price: true, specs: true, colors: true, sizes: true, discount: true, brand: true, colorImages: true, colorStock: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.order.count({ where }),
  ]);

  const serialized = orders
    .map((order) => ({
      ...order,
      total: Number(order.total),
      items: order.items.map((item) => ({ ...item, price: Number(item.price), size: item.size || null })),
    }))
    .map((order) => ({
      ...order,
      items: order.items.filter((item) => (cancelled ? item.status === "CANCELLED" : item.status !== "CANCELLED")),
    }))
    .filter((order) => order.items.length > 0);

  return NextResponse.json({ orders: serialized, total: serialized.length });
});

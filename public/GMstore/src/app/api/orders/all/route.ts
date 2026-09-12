import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  if (!req.auth || role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const take = parseInt(searchParams.get("take") || "20");
  const skip = (page - 1) * take;
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: { select: { id: true, name: true, nameEn: true, images: true, price: true, specs: true, colors: true, sizes: true, discount: true, brand: true } } } } },
    }),
    prisma.order.count(),
  ]);
  return NextResponse.json(orders.map((o) => ({ ...o, subtotal: Number(o.subtotal), shippingCost: Number(o.shippingCost), discount: Number(o.discount), total: Number(o.total), items: o.items.map((i) => ({ ...i, price: Number(i.price) })) })));
});

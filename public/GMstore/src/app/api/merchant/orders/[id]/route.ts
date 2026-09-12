import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (role !== "MERCHANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const merchantProductIds = await prisma.product.findMany({
    where: { userId },
    select: { id: true },
  });
  const productIds = merchantProductIds.map((p) => p.id);

  const order = await prisma.order.findFirst({
    where: {
      id,
      items: { some: { productId: { in: productIds } } },
    },
    include: {
      items: {
        where: { productId: { in: productIds } },
        include: { product: { select: { id: true, name: true, nameEn: true, images: true, price: true, specs: true, colors: true, sizes: true, discount: true, brand: true, colorImages: true, colorStock: true } } },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const serialized = {
    ...order,
    total: Number(order.total),
    items: order.items.map((item) => ({ ...item, price: Number(item.price) })),
  };

  return NextResponse.json(serialized);
});

export const PATCH = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (role !== "MERCHANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { itemId, status } = body;

  if (!["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId: id },
    include: { product: { select: { userId: true } } },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (item.product.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.orderItem.update({
    where: { id: itemId },
    data: { status },
  });

  const allItems = await prisma.orderItem.findMany({ where: { orderId: id } });
  const allDelivered = allItems.every((i) => i.status === "DELIVERED");
  const anyCancelled = allItems.some((i) => i.status === "CANCELLED");

  let orderStatus = "PENDING";
  if (allDelivered) orderStatus = "DELIVERED";
  else if (anyCancelled && allItems.every((i) => i.status === "DELIVERED" || i.status === "CANCELLED")) orderStatus = "DELIVERED";
  else if (allItems.some((i) => i.status === "SHIPPED")) orderStatus = "SHIPPED";
  else if (allItems.some((i) => i.status === "PROCESSING")) orderStatus = "PROCESSING";

  await prisma.order.update({
    where: { id },
    data: { status: orderStatus as any },
  });

  return NextResponse.json({ success: true });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: { select: { name: true, nameEn: true, images: true, price: true, specs: true, colors: true, sizes: true, discount: true, brand: true, colorImages: true, colorStock: true } } } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const serialized = {
    ...order,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    discount: Number(order.discount),
    total: Number(order.total),
    items: order.items.map((i) => ({ ...i, price: Number(i.price) })),
  };
  return NextResponse.json(serialized);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }
  if (order.status === "SHIPPED" || order.status === "DELIVERED" || order.status === "CANCELLED") {
    return NextResponse.json({ error: "لا يمكن إلغاء الطلب بعد الشحن" }, { status: 400 });
  }
  await prisma.orderItem.updateMany({
    where: { orderId: id, status: { not: "CANCELLED" } },
    data: { status: "CANCELLED" },
  });
  await prisma.order.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json({ success: true });
}

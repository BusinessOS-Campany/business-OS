import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const { id, itemId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const item = await prisma.orderItem.findFirst({
      where: { id: itemId, orderId: id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
    });

    const allItems = await prisma.orderItem.findMany({ where: { orderId: id } });
    const allDelivered = allItems.every((i) => i.status === "DELIVERED");
    const allCancelled = allItems.every((i) => i.status === "CANCELLED");
    const anyCancelled = allItems.some((i) => i.status === "CANCELLED");

    let orderStatus = "PENDING";
    if (allCancelled) orderStatus = "CANCELLED";
    else if (allDelivered) orderStatus = "DELIVERED";
    else if (anyCancelled && allItems.every((i) => i.status === "DELIVERED" || i.status === "CANCELLED")) orderStatus = "DELIVERED";
    else if (allItems.some((i) => i.status === "SHIPPED")) orderStatus = "SHIPPED";
    else if (allItems.some((i) => i.status === "PROCESSING")) orderStatus = "PROCESSING";

    await prisma.order.update({
      where: { id },
      data: { status: orderStatus as OrderStatus },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update item status" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const PATCH = auth(async (req, { params }: any) => {
  const role = (req.auth?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();

  const valid = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
  if (!valid.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await prisma.orderItem.updateMany({
    where: { orderId: id, status: { not: "CANCELLED" } },
    data: { status },
  });

  await prisma.order.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ success: true });
});

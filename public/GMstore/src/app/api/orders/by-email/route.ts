import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const orders = await prisma.order.findMany({
      where: { customerEmail: { equals: email, mode: "insensitive" } },
      include: { items: { include: { product: { select: { name: true, nameEn: true, images: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      orders.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        shippingCost: Number(o.shippingCost),
        discount: Number(o.discount),
        total: Number(o.total),
        items: o.items.map((i) => ({ ...i, price: Number(i.price) })),
      }))
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

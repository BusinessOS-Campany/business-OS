import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { calculateShippingCost } from "@/lib/shipping";

function extractAddressParts(raw: string) {
  const obj: Record<string, string> = {};
  try { Object.assign(obj, JSON.parse(raw || "{}")); } catch {}
  return obj;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerName, customerEmail, customerPhone, shippingAddress, items, couponCode } = body;
    if (!items?.length) return NextResponse.json({ error: "السلة فارغة" }, { status: 400 });

    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        user: { include: { store: { select: { id: true } } } },
      },
    });
    const productMap = new Map(products.map((p: any) => [p.id, p]));

    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      const price = Number(product.price);
      subtotal += price * item.quantity;
      return { productId: item.productId, quantity: item.quantity, price, color: item.color || null, size: item.size || null, status: "PENDING" };
    });

    let discount = 0;
    let couponId: string | undefined;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (coupon && coupon.active && (!coupon.expiresAt || coupon.expiresAt > new Date()) && (!coupon.maxUses || coupon.usedCount < coupon.maxUses) && (!coupon.minAmount || Number(coupon.minAmount) <= subtotal)) {
        discount = Math.round(subtotal * coupon.discount / 100);
        couponId = coupon.id;
        await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }
    }

    const addressObj = extractAddressParts(shippingAddress);
    const shippingCost = calculateShippingCost({
      subtotal,
      lat: addressObj.lat ? Number(addressObj.lat) : undefined,
      lng: addressObj.lng ? Number(addressObj.lng) : undefined,
      storeLat: undefined,
      storeLng: undefined,
    });
    const total = subtotal + shippingCost - discount;

    const order = await prisma.order.create({
      data: {
        customerName, customerEmail, customerPhone, shippingAddress,
        subtotal, shippingCost, discount, total, couponId, status: "PENDING",
        items: { create: orderItems },
      },
      include: { items: true },
    });

    for (const item of orderItems) {
      const product = productMap.get(item.productId);
      if (product) {
        const colorStock = (product.colorStock as Record<string, number> | null) || {};
        const newStock = Number(product.stock) - item.quantity;
        if (item.color && colorStock[item.color] !== undefined) {
          colorStock[item.color] = Math.max(0, Number(colorStock[item.color]) - item.quantity);
        }
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: newStock, colorStock },
        });
      }
    }

    logger.info("Order created", { orderId: order.id, shippingCost, discount, total });
    const serialized = {
      ...order,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      discount: Number(order.discount),
      total: Number(order.total),
      items: order.items.map((i) => ({ ...i, price: Number(i.price) })),
    };
    return NextResponse.json(serialized);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "فشل إنشاء الطلب";
    logger.error("Checkout failed", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
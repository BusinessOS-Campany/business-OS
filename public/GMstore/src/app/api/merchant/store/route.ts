import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function getOrCreateStore(userId: string) {
  let store = await prisma.store.findUnique({ where: { userId } });
  if (!store) {
    store = await prisma.store.create({
      data: { userId },
    });
  }
  return store;
}

export const GET = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (role !== "MERCHANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await getOrCreateStore(userId);
  return NextResponse.json(store);
});

export const PUT = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (role !== "MERCHANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = [
    "name", "nameEn", "description", "descriptionEn",
    "logo", "cover", "phone", "whatsapp", "telegram",
    "instagram", "facebook", "twitter", "tiktok", "shippingAddress",
  ];

  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.lat !== undefined) data.lat = body.lat;
  if (body.lng !== undefined) data.lng = body.lng;

  const store = await getOrCreateStore(userId);
  const updated = await prisma.store.update({
    where: { id: store.id },
    data,
  });

  return NextResponse.json(updated);
});

export const PATCH = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (role !== "MERCHANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = [
    "name", "nameEn", "description", "descriptionEn",
    "logo", "cover", "phone", "whatsapp", "telegram",
    "instagram", "facebook", "twitter", "tiktok", "shippingAddress",
  ];

  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.lat !== undefined) data.lat = body.lat;
  if (body.lng !== undefined) data.lng = body.lng;

  const store = await getOrCreateStore(userId);
  const updated = await prisma.store.update({
    where: { id: store.id },
    data,
  });

  return NextResponse.json(updated);
});

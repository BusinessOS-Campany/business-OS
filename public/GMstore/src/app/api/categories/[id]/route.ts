import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const PATCH = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  if (!req.auth || (req.auth.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const category = await prisma.category.update({
    where: { id },
    data: { name: body.name, nameEn: body.nameEn || null, slug: body.slug, description: body.description, image: body.image || null },
  });
  return NextResponse.json(category);
});

export const DELETE = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  if (!req.auth || (req.auth.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
});

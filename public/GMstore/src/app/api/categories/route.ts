import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = async () => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
};

export const POST = auth(async (req) => {
  if (!req.auth || (req.auth.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const category = await prisma.category.create({
    data: { name: body.name, nameEn: body.nameEn || null, slug: body.slug, description: body.description, image: body.image || null },
  });
  return NextResponse.json(category);
});

export const PATCH = auth(async (req) => {
  if (!req.auth || (req.auth.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const category = await prisma.category.update({
    where: { id: body.id },
    data: { name: body.name, nameEn: body.nameEn || null, slug: body.slug, description: body.description, image: body.image || null },
  });
  return NextResponse.json(category);
});

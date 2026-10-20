import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const PATCH = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  if (!req.auth || (req.auth.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const banner = await prisma.banner.update({
    where: { id },
    data: {
      image: body.image,
      title: body.title ?? undefined,
      titleEn: body.titleEn ?? undefined,
      desc: body.desc ?? undefined,
      descEn: body.descEn ?? undefined,
      link: body.link ?? undefined,
      order: body.order ?? undefined,
      active: body.active ?? undefined,
    },
  });
  return NextResponse.json(banner);
});

export const DELETE = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  if (!req.auth || (req.auth.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.banner.delete({ where: { id } });
  return NextResponse.json({ success: true });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const banners = await prisma.banner.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json(banners);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message, code: error?.code }, { status: 500 });
  }
}

export const POST = auth(async (req) => {
  if (!req.auth || (req.auth.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const banner = await prisma.banner.create({
    data: {
      image: body.image,
      title: body.title || null,
      titleEn: body.titleEn || null,
      desc: body.desc || null,
      descEn: body.descEn || null,
      link: body.link || "/products",
      order: body.order ?? 0,
      active: body.active ?? true,
    },
  });
  return NextResponse.json(banner);
});

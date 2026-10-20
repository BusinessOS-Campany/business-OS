import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  if (!req.auth || role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reviews = await prisma.review.findMany({
    include: { user: { select: { name: true, email: true } }, product: { select: { name: true, nameEn: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(reviews);
});

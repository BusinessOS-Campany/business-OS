import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  if (!req.auth || role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const conversations = await prisma.conversation.findMany({
    where: status ? { status } : undefined,
    include: {
      customer: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json(conversations);
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { name: true, role: true } } },
      },
      admin: { select: { name: true } },
      customer: { select: { name: true, email: true } },
    },
  });
  if (!conversation || conversation.customerId !== req.auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(conversation);
});

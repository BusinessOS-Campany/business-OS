import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const PATCH = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation || conversation.customerId !== req.auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: req.auth.user.id }, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const POST = auth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const role = (req.auth?.user as any)?.role;
  if (!req.auth || role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conversation.status === "CLOSED") {
    return NextResponse.json({ error: "Conversation is closed" }, { status: 400 });
  }
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });
  const userId = (req.auth?.user as any)?.id;
  if (!conversation.adminId) {
    await prisma.conversation.update({ where: { id }, data: { adminId: userId } });
  }
  const message = await prisma.message.create({
    data: { conversationId: id, senderId: userId, content },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });
  await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json(message);
});

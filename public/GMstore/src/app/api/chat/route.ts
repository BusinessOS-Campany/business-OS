import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conversations = await prisma.conversation.findMany({
    where: { customerId: req.auth.user.id },
    include: {
      messages: { take: 1, orderBy: { createdAt: "desc" } },
      admin: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(conversations);
});

export const POST = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subject, message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  const conversation = await prisma.conversation.create({
    data: {
      customerId: req.auth.user.id,
      subject: subject || null,
      messages: { create: { senderId: req.auth.user.id, content: message } },
    },
    include: { messages: true },
  });
  return NextResponse.json(conversation);
});

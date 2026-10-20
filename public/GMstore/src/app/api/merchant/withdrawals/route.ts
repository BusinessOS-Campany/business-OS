import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const GET = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (role !== "MERCHANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const serialized = withdrawals.map((w) => ({
    ...w,
    amount: Number(w.amount),
    fee: Number(w.fee),
  }));

  return NextResponse.json(serialized);
});

export const POST = auth(async (req) => {
  const role = (req.auth?.user as any)?.role;
  const userId = (req.auth?.user as any)?.id;
  if (role !== "MERCHANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { amount, method, accountInfo } = body;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!method) {
    return NextResponse.json({ error: "Method is required" }, { status: 400 });
  }

  const fee = Math.round(Number(amount) * 0.02 * 100) / 100;

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId,
      amount: Number(amount),
      fee,
      method,
      accountInfo,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    ...withdrawal,
    amount: Number(withdrawal.amount),
    fee: Number(withdrawal.fee),
  });
});

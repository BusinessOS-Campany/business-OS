import "server-only";
import { cache } from "react";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const getPayments = cache(async (opts?: { q?: string; method?: string; status?: string; limit?: number }) => {
  return prisma.payment.findMany({
    where: {
      ...(opts?.method ? { method: opts.method as PaymentMethod } : {}),
      ...(opts?.status ? { status: opts.status as PaymentStatus } : {}),
      ...(opts?.q
        ? {
            OR: [
              { paymentNo: { contains: opts.q, mode: "insensitive" as const } },
              { patient: { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }, { mrn: { contains: opts.q } }] } },
              { invoice: { invoiceNo: { contains: opts.q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: {
      invoice: { select: { id: true, invoiceNo: true } },
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
      cashier: { select: { id: true, nameAr: true, nameEn: true } },
      refunds: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { paidAt: "desc" },
    take: opts?.limit ?? 100,
  });
});

export const getPaymentById = cache(async (id: string) => {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: { select: { id: true, invoiceNo: true, total: true, paidAmount: true, dueAmount: true, status: true } },
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true, phone: true } },
      cashier: { select: { id: true, nameAr: true, nameEn: true } },
      refunds: {
        orderBy: { createdAt: "desc" },
        include: { cashier: { select: { id: true, nameAr: true, nameEn: true } } },
      },
    },
  });
});

export const getPaymentStats = cache(async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [todayAgg, completedAgg, refundAgg, byMethod] = await Promise.all([
    prisma.payment.aggregate({
      where: { paidAt: { gte: startOfToday }, status: { in: ["COMPLETED", "REFUNDED"] } },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.refund.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  const byMethodSums: Record<string, number> = {};
  for (const g of byMethod) byMethodSums[g.method] = Number(g._sum.amount ?? 0);

  return {
    todayCount: todayAgg._count,
    todaySum: Number(todayAgg._sum.amount ?? 0),
    totalSum: Number(completedAgg._sum.amount ?? 0),
    refundSum: Number(refundAgg._sum.amount ?? 0),
    refundCount: refundAgg._count,
    byMethodSums,
  };
});

export const getRefunds = cache(async (opts?: { limit?: number }) => {
  return prisma.refund.findMany({
    include: {
      invoice: { select: { id: true, invoiceNo: true } },
      payment: { select: { id: true, paymentNo: true } },
      cashier: { select: { id: true, nameAr: true, nameEn: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 100,
  });
});
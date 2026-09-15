import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getInvoices = cache(async (opts?: { status?: string }) => {
  return prisma.invoice.findMany({
    where: opts?.status ? { status: opts.status as never } : undefined,
    orderBy: { issuedAt: "desc" },
    take: 500,
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
      cashier: { select: { id: true, nameAr: true, nameEn: true } },
      payments: { select: { id: true, amount: true, method: true, status: true } },
    },
  });
});

export const getInvoiceById = cache(async (id: string) => {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: {
        select: { id: true, mrn: true, nameAr: true, nameEn: true, phone: true, gender: true, age: true },
      },
      cashier: { select: { id: true, nameAr: true, nameEn: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { service: { select: { id: true, code: true, nameAr: true, nameEn: true } } },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        include: { cashier: { select: { id: true, nameAr: true, nameEn: true } } },
      },
      refunds: { orderBy: { createdAt: "desc" } },
      insuranceClaim: {
        include: { company: { select: { id: true, nameAr: true, nameEn: true } } },
      },
    },
  });
});

export const getServices = cache(async () => {
  return prisma.service.findMany({
    where: { isActive: true },
    orderBy: { nameEn: "asc" },
    take: 500,
    select: {
      id: true,
      code: true,
      nameAr: true,
      nameEn: true,
      type: true,
      price: true,
      currency: true,
    },
  });
});

export const getBillingPatients = cache(async () => {
  return prisma.patient.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, mrn: true, nameAr: true, nameEn: true, phone: true },
  });
});

export const getBillingStats = cache(async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayAgg, outstandingAgg, totalAgg, counts] = await Promise.all([
    prisma.invoice.aggregate({
      where: { issuedAt: { gte: todayStart } },
      _sum: { total: true, paidAmount: true, dueAmount: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      _sum: { dueAmount: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      _sum: { total: true, paidAmount: true },
      _count: true,
    }),
    prisma.$transaction([
      prisma.invoice.count({ where: { status: "DRAFT" } }),
      prisma.invoice.count({ where: { status: "ISSUED" } }),
      prisma.invoice.count({ where: { status: "PARTIALLY_PAID" } }),
      prisma.invoice.count({ where: { status: "PAID" } }),
      prisma.invoice.count({ where: { status: { in: ["VOID", "REFUNDED"] } } }),
    ]),
  ]);

  return {
    todayTotal: todayAgg._sum.total ?? 0,
    todayPaid: todayAgg._sum.paidAmount ?? 0,
    todayCount: todayAgg._count,
    outstanding: outstandingAgg._sum.dueAmount ?? 0,
    outstandingCount: outstandingAgg._count,
    overallTotal: totalAgg._sum.total ?? 0,
    overallPaid: totalAgg._sum.paidAmount ?? 0,
    draft: counts[0],
    issued: counts[1],
    partial: counts[2],
    paid: counts[3],
    closed: counts[4],
  };
});
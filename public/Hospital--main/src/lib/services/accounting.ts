import "server-only";
import { cache } from "react";
import type { AccountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const getAccounts = cache(async (opts?: { q?: string; type?: string }) => {
  return prisma.account.findMany({
    where: {
      ...(opts?.type ? { type: opts.type as AccountType } : {}),
      ...(opts?.q
        ? {
            OR: [
              { code: { contains: opts.q, mode: "insensitive" as const } },
              { nameAr: { contains: opts.q } },
              { nameEn: { contains: opts.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: {
      parent: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      _count: { select: { children: true } },
    },
    orderBy: { code: "asc" },
    take: 1000,
  });
});

export const getAccountById = cache(async (id: string) => {
  return prisma.account.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      children: {
        orderBy: { code: "asc" },
        select: { id: true, code: true, nameAr: true, nameEn: true, type: true },
      },
    },
  });
});

export const getJournalEntries = cache(async (opts?: { limit?: number }) => {
  return prisma.journalEntry.findMany({
    include: {
      lines: {
        include: { account: { select: { id: true, code: true, nameAr: true, nameEn: true } } },
      },
    },
    orderBy: { date: "desc" },
    take: opts?.limit ?? 100,
  });
});

export const getJournalEntryById = cache(async (id: string) => {
  return prisma.journalEntry.findUnique({
    where: { id },
    include: {
      lines: {
        orderBy: { createdAt: "asc" },
        include: { account: { select: { id: true, code: true, nameAr: true, nameEn: true } } },
      },
    },
  });
});

export const getExpenses = cache(async (opts?: { limit?: number }) => {
  return prisma.expense.findMany({
    include: {
      category: { select: { id: true, nameAr: true, nameEn: true } },
      paidBy: { select: { id: true, nameAr: true, nameEn: true } },
      supplier: { select: { id: true, nameAr: true, nameEn: true } },
    },
    orderBy: { paidAt: "desc" },
    take: opts?.limit ?? 100,
  });
});

export const getExpenseCategories = cache(async () => {
  return prisma.expenseCategory.findMany({
    include: { account: { select: { id: true, code: true, nameAr: true, nameEn: true } } },
    orderBy: { nameEn: "asc" },
    take: 500,
  });
});

export const getExpensePayers = cache(async () => {
  return prisma.employee.findMany({
    where: { employeeStatus: "ACTIVE" },
    select: { id: true, nameAr: true, nameEn: true },
    orderBy: { nameEn: "asc" },
    take: 100,
  });
});

export const getSuppliers = cache(async () => {
  return prisma.supplier.findMany({
    where: { isActive: true },
    select: { id: true, code: true, nameAr: true, nameEn: true },
    orderBy: { nameEn: "asc" },
    take: 500,
  });
});

export const getAccountingStats = cache(async () => {
  const [revenueAgg, expenseAgg, receivableAgg, cashAgg] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: "PAID" },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      _sum: { dueAmount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  return {
    revenue: Number(revenueAgg._sum.total ?? 0),
    expenses: Number(expenseAgg._sum.amount ?? 0),
    receivables: Number(receivableAgg._sum.dueAmount ?? 0),
    cash: Number(cashAgg._sum.amount ?? 0),
  };
});
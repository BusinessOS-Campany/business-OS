import { prisma } from "@/lib/prisma";

export function getPayrollPeriods(opts: { limit?: number } = {}) {
  return prisma.payrollPeriod.findMany({
    include: {
      runs: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { lines: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
  });
}

export function getPayrollPeriodById(id: string) {
  return prisma.payrollPeriod.findUnique({
    where: { id },
    include: {
      runs: {
        orderBy: { createdAt: "asc" },
        include: {
          lines: {
            orderBy: { createdAt: "asc" },
            include: {
              employee: { select: { id: true, employeeNo: true, nameAr: true, nameEn: true } },
            },
          },
        },
      },
    },
  });
}

export function getPayrollRunById(id: string) {
  return prisma.payrollRun.findUnique({
    where: { id },
    include: {
      period: true,
      lines: {
        orderBy: { createdAt: "asc" },
        include: {
          employee: { select: { id: true, employeeNo: true, nameAr: true, nameEn: true } },
        },
      },
    },
  });
}

export async function getPayrollStats() {
  const [periods, draft, approved, paid, totalAgg] = await Promise.all([
    prisma.payrollPeriod.count(),
    prisma.payrollRun.count({ where: { status: "DRAFT" } }),
    prisma.payrollRun.count({ where: { status: "APPROVED" } }),
    prisma.payrollRun.count({ where: { status: "PAID" } }),
    prisma.payrollLine.aggregate({
      where: { payrollRun: { status: "PAID" } },
      _sum: { net: true },
    }),
  ]);

  return { periods, draft, approved, paid, totalPaid: Number(totalAgg._sum.net ?? 0) };
}
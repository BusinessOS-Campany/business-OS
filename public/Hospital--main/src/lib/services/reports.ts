import "server-only";
import { prisma } from "@/lib/prisma";

export interface DateRange {
  from?: Date;
  to?: Date;
}

function between(range: DateRange) {
  if (!range.from && !range.to) return undefined;
  return {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.to ? { lte: range.to } : {}),
  };
}

export function getPatientStatistics(range: DateRange = {}) {
  const createdAt = between(range);
  return Promise.all([
    prisma.patient.count({ where: createdAt ? { createdAt } : undefined }),
    prisma.patient.count({ where: createdAt ? { createdAt } : undefined }),
    prisma.patient.groupBy({
      by: ["gender"],
      _count: { _all: true },
      where: createdAt ? { createdAt } : undefined,
    }),
  ]).then(([newPatients, total, byGender]) => ({
    newPatients,
    total,
    byGender: byGender.map((g) => ({ gender: g.gender ?? "UNKNOWN", count: g._count._all })),
  }));
}

export async function getFinancialStatistics(range: DateRange = {}) {
  const createdAt = between(range);
  const rangeWhere = createdAt ? { createdAt } : undefined;

  const [revenueAgg, paymentsAgg, refundsAgg, outstandingAgg, invoicesCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: "PAID", ...(rangeWhere ?? {}) },
      _sum: { total: true },
    }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED", ...(rangeWhere ?? {}) },
      _sum: { amount: true },
    }),
    prisma.refund.aggregate({
      where: { ...(rangeWhere ?? {}) },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      _sum: { total: true, paidAmount: true },
    }),
    prisma.invoice.count({ where: rangeWhere }),
  ]);

  const outstanding =
    Number(outstandingAgg._sum.total ?? 0) - Number(outstandingAgg._sum.paidAmount ?? 0);

  return {
    revenue: Number(revenueAgg._sum.total ?? 0),
    payments: Number(paymentsAgg._sum.amount ?? 0),
    refunds: Number(refundsAgg._sum.amount ?? 0),
    outstanding,
    invoicesCount,
  };
}

export async function getOperationalStatistics(range: DateRange = {}) {
  const createdAt = between(range);
  const rangeWhere = createdAt ? { createdAt } : undefined;

  const [admissions, discharges, totalBeds, occupiedBeds, appointments, labOrders, radOrders] =
    await Promise.all([
      prisma.admission.count({ where: { ...(rangeWhere ?? {}), status: { not: "CANCELLED" } } }),
      prisma.admission.count({
        where: {
          status: "DISCHARGED",
          ...(range.from || range.to
            ? { dischargedAt: between(range) }
            : {}),
        },
      }),
      prisma.bed.count({ where: { status: { not: "BLOCKED" } } }),
      prisma.bed.count({ where: { status: "OCCUPIED" } }),
      prisma.appointment.count({ where: rangeWhere }),
      prisma.labOrder.count({ where: rangeWhere }),
      prisma.radiologyOrder.count({ where: rangeWhere }),
    ]);

  return {
    admissions,
    discharges,
    totalBeds,
    occupiedBeds,
    occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    appointments,
    labOrders,
    radOrders,
  };
}

export async function getDepartmentPerformance() {
  const grouped = await prisma.encounter.groupBy({
    by: ["departmentId"],
    _count: { _all: true },
  });

  const deptIds = grouped.map((g) => g.departmentId).filter((id): id is string => Boolean(id));
  const departments = deptIds.length
    ? await prisma.department.findMany({
        where: { id: { in: deptIds } },
        select: { id: true, code: true, nameAr: true, nameEn: true },
      })
    : [];
  const byId = new Map(departments.map((d) => [d.id, d]));

  return grouped
    .map((g) => {
      const dept = g.departmentId ? byId.get(g.departmentId) : undefined;
      return {
        id: g.departmentId ?? "unassigned",
        code: dept?.code ?? "—",
        nameAr: dept?.nameAr ?? "غير محدد",
        nameEn: dept?.nameEn ?? "Unassigned",
        encounters: g._count._all,
      };
    })
    .sort((a, b) => b.encounters - a.encounters);
}

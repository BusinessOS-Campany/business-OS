import type { RadModality, RadOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ORDER_BASE = {
  patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
  encounter: {
    select: {
      id: true,
      department: { select: { id: true, nameAr: true, nameEn: true } },
    },
  },
  doctor: { select: { id: true, nameAr: true, nameEn: true } },
  report: {
    include: {
      reportedBy: { select: { id: true, nameAr: true, nameEn: true } },
      reviewedBy: { select: { id: true, nameAr: true, nameEn: true } },
    },
  },
} as const;

export function getRadOrders(opts: { status?: RadOrderStatus; q?: string; limit?: number } = {}) {
  return prisma.radiologyOrder.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { orderNo: { contains: opts.q, mode: "insensitive" as const } },
              { patient: { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }, { mrn: { contains: opts.q } }] } },
            ],
          }
        : {}),
    },
    include: ORDER_BASE,
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });
}

export function getRadOrderById(id: string) {
  return prisma.radiologyOrder.findUnique({ where: { id }, include: ORDER_BASE });
}

export async function getRadStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [openCount, todayCount, reportedCount, pendingReport] = await Promise.all([
    prisma.radiologyOrder.count({ where: { status: { in: ["ORDERED", "SCHEDULED", "PERFORMED"] } } }),
    prisma.radiologyOrder.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.radiologyOrder.count({ where: { status: { in: ["REPORTED", "REVIEWED"] } } }),
    prisma.radiologyOrder.count({ where: { status: "PERFORMED", report: null } }),
  ]);

  return { openCount, todayCount, reportedCount, pendingReport };
}

export const RAD_STATUSES = [
  { key: "radStatusOrdered", value: "ORDERED", variant: "info" as const },
  { key: "radStatusScheduled", value: "SCHEDULED", variant: "secondary" as const },
  { key: "radStatusPerformed", value: "PERFORMED", variant: "warning" as const },
  { key: "radStatusReported", value: "REPORTED", variant: "success" as const },
  { key: "radStatusReviewed", value: "REVIEWED", variant: "default" as const },
  { key: "radStatusCancelled", value: "CANCELLED", variant: "destructive" as const },
] as const;

export const RAD_MODALITIES: Array<{ value: RadModality; key: string }> = [
  { value: "XRAY", key: "modalityXRAY" },
  { value: "CT", key: "modalityCT" },
  { value: "MRI", key: "modalityMRI" },
  { value: "ULTRASOUND", key: "modalityULTRASOUND" },
  { value: "MAMMOGRAPHY", key: "modalityMAMMOGRAPHY" },
  { value: "FLUOROSCOPY", key: "modalityFLUOROSCOPY" },
  { value: "PET", key: "modalityPET" },
  { value: "OTHER", key: "modalityOTHER" },
] as const;
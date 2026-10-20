import type { LabOrderStatus, SampleType } from "@prisma/client";
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
  items: {
    include: {
      test: { select: { id: true, code: true, nameAr: true, nameEn: true, unit: true, sampleType: true } },
      results: {
        include: {
          performedBy: { select: { id: true, nameAr: true, nameEn: true } },
          verifiedBy: { select: { id: true, nameAr: true, nameEn: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  },
} as const;

export function getLabOrders(opts: { status?: LabOrderStatus; q?: string; limit?: number } = {}) {
  return prisma.labOrder.findMany({
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

export function getLabOrderById(id: string) {
  return prisma.labOrder.findUnique({
    where: { id },
    include: ORDER_BASE,
  });
}

export function getLabTests(opts: { activeOnly?: boolean; q?: string } = {}) {
  return prisma.labTest.findMany({
    where: {
      ...(opts.activeOnly ? { isActive: true } : {}),
      ...(opts.q
        ? {
            OR: [
              { nameAr: { contains: opts.q } },
              { nameEn: { contains: opts.q } },
              { code: { contains: opts.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ category: "asc" }, { nameEn: "asc" }],
    take: 200,
  });
}

export async function getLabStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [openCount, todayCount, reviewedCount, testCount] = await Promise.all([
    prisma.labOrder.count({
      where: { status: { in: ["ORDERED", "COLLECTED", "RECEIVED", "PROCESSING"] } },
    }),
    prisma.labOrder.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.labOrder.count({ where: { status: "REVIEWED" } }),
    prisma.labTest.count({ where: { isActive: true } }),
  ]);

  return { openCount, todayCount, reviewedCount, testCount };
}

export const SAMPLE_TYPES: Array<{ value: SampleType; key: string }> = [
  { value: "BLOOD", key: "sampleTypeBLOOD" },
  { value: "URINE", key: "sampleTypeURINE" },
  { value: "STOOL", key: "sampleTypeSTOOL" },
  { value: "SPUTUM", key: "sampleTypeSPUTUM" },
  { value: "SWAB", key: "sampleTypeSWAB" },
  { value: "TISSUE", key: "sampleTypeTISSUE" },
  { value: "CSF", key: "sampleTypeCSF" },
  { value: "OTHER", key: "sampleTypeOTHER" },
];
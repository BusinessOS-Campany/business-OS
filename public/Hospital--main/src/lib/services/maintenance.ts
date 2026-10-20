import type { MaintenanceStatus, MaintenanceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getMaintenanceRequests(opts: { status?: MaintenanceStatus; q?: string; limit?: number } = {}) {
  return prisma.maintenanceRequest.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { requestNo: { contains: opts.q, mode: "insensitive" as const } },
              { description: { contains: opts.q } },
              { spareParts: { contains: opts.q } },
              {
                asset: {
                  OR: [{ assetNo: { contains: opts.q } }, { nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }],
                },
              },
              {
                technician: {
                  OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }],
                },
              },
            ],
          }
        : {}),
    },
    include: {
      asset: { select: { id: true, assetNo: true, nameAr: true, nameEn: true, serialNo: true } },
      technician: { select: { id: true, nameAr: true, nameEn: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });
}

export function getMaintenanceRequestById(id: string) {
  return prisma.maintenanceRequest.findUnique({
    where: { id },
    include: {
      asset: {
        select: { id: true, assetNo: true, nameAr: true, nameEn: true, category: true, serialNo: true, location: true, status: true },
      },
      technician: { select: { id: true, nameAr: true, nameEn: true } },
    },
  });
}

export async function getMaintenanceStats() {
  const [total, requested, scheduled, inProgress, completed, cancelled] = await Promise.all([
    prisma.maintenanceRequest.count(),
    prisma.maintenanceRequest.count({ where: { status: "REQUESTED" } }),
    prisma.maintenanceRequest.count({ where: { status: "SCHEDULED" } }),
    prisma.maintenanceRequest.count({ where: { status: "IN_PROGRESS" } }),
    prisma.maintenanceRequest.count({ where: { status: "COMPLETED" } }),
    prisma.maintenanceRequest.count({ where: { status: "CANCELLED" } }),
  ]);
  return { total, requested, scheduled, inProgress, completed, cancelled };
}

export async function getMaintenanceOptions() {
  const [assets, employees] = await Promise.all([
    prisma.asset.findMany({
      where: { status: { in: ["ACTIVE", "UNDER_MAINTENANCE"] } },
      select: { id: true, assetNo: true, nameAr: true, nameEn: true, serialNo: true },
      orderBy: { assetNo: "asc" },
      take: 200,
    }),
    prisma.employee.findMany({
      where: { employeeStatus: "ACTIVE" },
      select: { id: true, nameAr: true, nameEn: true },
      orderBy: { nameEn: "asc" },
      take: 200,
    }),
  ]);
  return { assets, employees };
}
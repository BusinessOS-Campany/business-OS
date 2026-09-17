import type { AssetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getAssets(opts: { status?: AssetStatus; q?: string; limit?: number } = {}) {
  return prisma.asset.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { assetNo: { contains: opts.q, mode: "insensitive" as const } },
              { nameAr: { contains: opts.q } },
              { nameEn: { contains: opts.q } },
              { location: { contains: opts.q } },
              { serialNo: { contains: opts.q } },
              {
                department: {
                  OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }],
                },
              },
              {
                custodian: {
                  OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }],
                },
              },
            ],
          }
        : {}),
    },
    include: {
      department: { select: { id: true, nameAr: true, nameEn: true } },
      custodian: { select: { id: true, nameAr: true, nameEn: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });
}

export function getAssetById(id: string) {
  return prisma.asset.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, nameAr: true, nameEn: true } },
      custodian: { select: { id: true, nameAr: true, nameEn: true } },
      maintenanceRequests: {
        orderBy: { createdAt: "desc" },
        include: { technician: { select: { id: true, nameAr: true, nameEn: true } } },
      },
    },
  });
}

export async function getAssetStats() {
  const [total, active, inactive, underMaintenance, retired, lost] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.count({ where: { status: "ACTIVE" } }),
    prisma.asset.count({ where: { status: "INACTIVE" } }),
    prisma.asset.count({ where: { status: "UNDER_MAINTENANCE" } }),
    prisma.asset.count({ where: { status: "RETIRED" } }),
    prisma.asset.count({ where: { status: "LOST" } }),
  ]);
  return { total, active, inactive, underMaintenance, retired, lost };
}

export async function getAssetOptions() {
  const [departments, employees] = await Promise.all([
    prisma.department.findMany({
      select: { id: true, nameAr: true, nameEn: true },
      orderBy: { nameEn: "asc" },
      take: 200,
    }),
    prisma.employee.findMany({
      where: { employeeStatus: "ACTIVE" },
      select: { id: true, nameAr: true, nameEn: true },
      orderBy: { nameEn: "asc" },
      take: 200,
    }),
  ]);
  return { departments, employees };
}
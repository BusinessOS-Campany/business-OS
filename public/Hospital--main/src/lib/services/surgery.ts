import type { SurgeryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getSurgeries(opts: { status?: SurgeryStatus; q?: string; limit?: number } = {}) {
  return prisma.surgery.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { surgeryNo: { contains: opts.q, mode: "insensitive" as const } },
              { procedureNameAr: { contains: opts.q } },
              { procedureNameEn: { contains: opts.q } },
              { patient: { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }, { mrn: { contains: opts.q } }] } },
            ],
          }
        : {}),
    },
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
      surgeon: { select: { id: true, nameAr: true, nameEn: true } },
      anesthesiologist: { select: { id: true, nameAr: true, nameEn: true } },
      operatingRoom: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      admission: { select: { id: true, admissionNo: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: opts.limit ?? 100,
  });
}

export function getSurgeryById(id: string) {
  return prisma.surgery.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true, phone: true } },
      surgeon: { select: { id: true, nameAr: true, nameEn: true } },
      anesthesiologist: { select: { id: true, nameAr: true, nameEn: true } },
      operatingRoom: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      admission: { select: { id: true, admissionNo: true } },
    },
  });
}

export function getOperatingRooms() {
  return prisma.operatingRoom.findMany({ where: { isActive: true }, orderBy: { code: "asc" } });
}

export async function getSurgeons() {
  return prisma.employee.findMany({
    where: { employeeType: "DOCTOR", employeeStatus: "ACTIVE" },
    select: { id: true, nameAr: true, nameEn: true },
    orderBy: { nameEn: "asc" },
    take: 100,
  });
}

export async function getAnesthesiologists() {
  return prisma.employee.findMany({
    where: { employeeType: "DOCTOR", employeeStatus: "ACTIVE" },
    select: { id: true, nameAr: true, nameEn: true },
    orderBy: { nameEn: "asc" },
    take: 100,
  });
}

export async function getSurgeryStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [scheduled, inProgress, completedToday, postOp, orCount] = await Promise.all([
    prisma.surgery.count({ where: { status: "SCHEDULED" } }),
    prisma.surgery.count({ where: { status: "IN_PROGRESS" } }),
    prisma.surgery.count({ where: { status: "COMPLETED", updatedAt: { gte: startOfToday } } }),
    prisma.surgery.count({ where: { status: "POST_OP" } }),
    prisma.operatingRoom.count({ where: { isActive: true } }),
  ]);

  return { scheduled, inProgress, completedToday, postOp, orCount };
}
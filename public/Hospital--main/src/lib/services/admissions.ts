import type { AdmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getAdmissions(opts: { status?: AdmissionStatus; icu?: boolean; q?: string; limit?: number } = {}) {
  return prisma.admission.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : { status: { not: "CANCELLED" } }),
      ...(opts.icu ? { isIcu: true } : {}),
      ...(opts.q
        ? {
            OR: [
              { admissionNo: { contains: opts.q, mode: "insensitive" as const } },
              { provisionalDiagnosis: { contains: opts.q } },
              { patient: { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }, { mrn: { contains: opts.q } }] } },
            ],
          }
        : {}),
    },
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true, phone: true } },
      department: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      bed: { select: { id: true, code: true, bedType: true, room: { select: { id: true, code: true, nameAr: true, nameEn: true } } } },
      attendingDoctor: { select: { id: true, nameAr: true, nameEn: true } },
      _count: { select: { nursingNotes: true, medAdministrations: true } },
    },
    orderBy: { admittedAt: "desc" },
    take: opts.limit ?? 100,
  });
}

export function getAdmissionById(id: string) {
  return prisma.admission.findUnique({
    where: { id },
    include: {
      patient: {
        select: { id: true, mrn: true, nameAr: true, nameEn: true, gender: true, phone: true, bloodGroup: true },
      },
      department: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      bed: { select: { id: true, code: true, bedType: true, room: { select: { id: true, code: true, nameAr: true, nameEn: true } } } },
      attendingDoctor: { select: { id: true, nameAr: true, nameEn: true } },
      encounter: { select: { id: true, encounterNo: true } },
      nursingNotes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { author: { select: { id: true, nameAr: true, nameEn: true } } },
      },
    },
  });
}

export async function getAdmissionStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const soon = new Date();
  soon.setDate(soon.getDate() + 2);

  const [admitted, icu, availableBeds, admittedToday, expectedSoon] = await Promise.all([
    prisma.admission.count({ where: { status: "ADMITTED" } }),
    prisma.admission.count({ where: { status: "ADMITTED", isIcu: true } }),
    prisma.bed.count({ where: { status: "AVAILABLE", isActive: true } }),
    prisma.admission.count({ where: { admittedAt: { gte: startOfToday } } }),
    prisma.admission.count({ where: { status: "ADMITTED", expectedDischargeAt: { lte: soon } } }),
  ]);

  return { admitted, icu, availableBeds, admittedToday, expectedSoon };
}

export async function getBedBoard() {
  const rows = await prisma.bed.groupBy({
    by: ["status"],
    where: { isActive: true },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status] = row._count._all;
  return {
    available: counts.AVAILABLE ?? 0,
    occupied: counts.OCCUPIED ?? 0,
    cleaning: counts.CLEANING ?? 0,
    maintenance: counts.MAINTENANCE ?? 0,
    blocked: counts.BLOCKED ?? 0,
    reserved: counts.RESERVED ?? 0,
  };
}

export async function getAvailableBeds() {
  return prisma.bed.findMany({
    where: { status: "AVAILABLE", isActive: true },
    include: { room: { select: { id: true, code: true, nameAr: true, nameEn: true, type: true } } },
    orderBy: [{ room: { code: "asc" } }, { code: "asc" }],
    take: 200,
  });
}

export async function getAttendingDoctors() {
  return prisma.employee.findMany({
    where: { employeeType: "DOCTOR", employeeStatus: "ACTIVE" },
    select: { id: true, nameAr: true, nameEn: true },
    orderBy: { nameEn: "asc" },
    take: 100,
  });
}

export async function getAdmissionPatients() {
  return prisma.patient.findMany({
    select: { id: true, mrn: true, nameAr: true, nameEn: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
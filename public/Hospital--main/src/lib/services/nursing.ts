import type { MarAdminStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getAdmittedPatients() {
  return prisma.admission.findMany({
    where: { status: "ADMITTED" },
    select: {
      id: true,
      admissionNo: true,
      isIcu: true,
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
      bed: { select: { id: true, code: true, room: { select: { code: true } } } },
    },
    orderBy: { admittedAt: "desc" },
    take: 100,
  });
}

export function getNursingNotes(opts: { admissionId?: string; limit?: number } = {}) {
  return prisma.nursingNote.findMany({
    where: opts.admissionId ? { admissionId: opts.admissionId } : {},
    include: {
      admission: { select: { id: true, admissionNo: true, patient: { select: { id: true, nameAr: true, nameEn: true, mrn: true } } } },
      author: { select: { id: true, nameAr: true, nameEn: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 60,
  });
}

export function getMedAdministrations(opts: { admissionId?: string; limit?: number } = {}) {
  return prisma.medAdministration.findMany({
    where: opts.admissionId ? { admissionId: opts.admissionId } : {},
    include: {
      admission: { select: { id: true, admissionNo: true, patient: { select: { id: true, nameAr: true, nameEn: true, mrn: true } } } },
      givenBy: { select: { id: true, nameAr: true, nameEn: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: opts.limit ?? 60,
  });
}

export async function getFluidItems(admissionId?: string) {
  const items = await prisma.fluidBalanceItem.findMany({
    where: admissionId ? { admissionId } : {},
    include: {
      admission: { select: { id: true, admissionNo: true, patient: { select: { id: true, nameAr: true, nameEn: true, mrn: true } } } },
    },
    orderBy: { recordedAt: "desc" },
    take: admissionId ? 100 : 30,
  });
  return items.map((item) => ({ ...item, amount: Number(item.amount) }));
}

export async function getNursingStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [admitted, icu, notesToday, medicationsToday, fluidToday] = await Promise.all([
    prisma.admission.count({ where: { status: "ADMITTED" } }),
    prisma.admission.count({ where: { status: "ADMITTED", isIcu: true } }),
    prisma.nursingNote.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.medAdministration.count({ where: { scheduledAt: { gte: startOfToday }, marStatus: "GIVEN" } }),
    prisma.fluidBalanceItem.count({ where: { recordedAt: { gte: startOfToday } } }),
  ]);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const fluidItems = await prisma.fluidBalanceItem.findMany({
    where: { recordedAt: { gte: start } },
    select: { type: true, amount: true },
  });
  const intake = fluidItems.filter((i) => i.type === "INTAKE").reduce((s, i) => s + Number(i.amount), 0);
  const output = fluidItems
    .filter((i) => i.type === "OUTPUT")
    .reduce((s, i) => s + Number(i.amount), 0);

  return { admitted, icu, notesToday, medicationsToday, fluidToday, intake, output };
}

export async function getMarStatusOptions(): Promise<MarAdminStatus[]> {
  return ["GIVEN", "OMITTED", "REFUSED", "HOLD", "SKIPPED"];
}

export async function getPatientById(id: string) {
  return prisma.patient.findUnique({
    where: { id },
    select: { id: true, mrn: true, nameAr: true, nameEn: true },
  });
}
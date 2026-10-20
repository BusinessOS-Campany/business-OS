import type { TriageLevel, EncounterStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getEmergencyEncounters(opts: { status?: EncounterStatus; q?: string; limit?: number } = {}) {
  return prisma.encounter.findMany({
    where: {
      encounterType: "EMERGENCY",
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { encounterNo: { contains: opts.q, mode: "insensitive" as const } },
              { patient: { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }, { mrn: { contains: opts.q } }] } },
            ],
          }
        : {}),
    },
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true, phone: true, gender: true } },
      doctor: { select: { id: true, nameAr: true, nameEn: true } },
      vitals: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
    orderBy: [{ triageLevel: "asc" }, { createdAt: "asc" }],
    take: opts.limit ?? 100,
  });
}

export async function getEmergencyStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [waitingCount, inConsultCount, completedToday, criticalCount] = await Promise.all([
    prisma.encounter.count({ where: { encounterType: "EMERGENCY", status: "WAITING" } }),
    prisma.encounter.count({ where: { encounterType: "EMERGENCY", status: "IN_PROGRESS" } }),
    prisma.encounter.count({ where: { encounterType: "EMERGENCY", status: "COMPLETED", completedAt: { gte: startOfToday } } }),
    prisma.encounter.count({ where: { encounterType: "EMERGENCY", status: { in: ["WAITING", "IN_PROGRESS"] }, triageLevel: { in: ["RESUSCITATION", "EMERGENT"] } } }),
  ]);

  return { waitingCount, inConsultCount, completedToday, criticalCount };
}

export const TRIAGE_LEVELS: Array<{ value: TriageLevel; key: string; color: string }> = [
  { value: "RESUSCITATION", key: "emergency.triageResuscitation", color: "destructive" },
  { value: "EMERGENT", key: "emergency.triageEmergent", color: "warning" },
  { value: "URGENT", key: "emergency.triageUrgent", color: "info" },
  { value: "LESS_URGENT", key: "emergency.triageLessUrgent", color: "secondary" },
  { value: "NON_URGENT", key: "emergency.triageNonUrgent", color: "outline" },
] as const;
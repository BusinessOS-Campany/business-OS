import type { BloodGroup, BloodUnitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getDonors(opts: { q?: string; includeInactive?: boolean } = {}) {
  return prisma.bloodDonor.findMany({
    where: {
      ...(opts.includeInactive ? {} : { isActive: true }),
      ...(opts.q
        ? { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }, { phone: { contains: opts.q } }, { identityNo: { contains: opts.q } }] }
        : {}),
    },
    include: { donations: { select: { id: true, donationDate: true, units: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export function getDonationById(id: string) {
  return prisma.bloodDonation.findUnique({
    where: { id },
    include: {
      donor: { select: { id: true, nameAr: true, nameEn: true, bloodGroup: true, phone: true } },
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
      unitsResult: true,
    },
  });
}

export function getBloodUnits(opts: { status?: BloodUnitStatus; bloodGroup?: BloodGroup; q?: string } = {}) {
  return prisma.bloodUnit.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.bloodGroup ? { bloodGroup: opts.bloodGroup } : {}),
      ...(opts.q ? { OR: [{ unitNo: { contains: opts.q, mode: "insensitive" as const } }, { donation: { donor: { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }] } } }] } : {}),
    },
    include: {
      donation: { select: { donationDate: true, donor: { select: { id: true, nameAr: true, nameEn: true, bloodGroup: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getAvailableUnitsByGroup() {
  const groups = await prisma.bloodUnit.groupBy({
    by: ["bloodGroup"],
    where: { status: { in: ["AVAILABLE", "CROSSMATCHED"] } },
    _count: { _all: true },
  });
  return groups;
}

export async function getBloodBankStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const expiring = new Date();
  expiring.setDate(expiring.getDate() + 7);

  const [available, quarantined, reserved, issued, expiringSoon, donorCount, donationsToday, totalUnits] = await Promise.all([
    prisma.bloodUnit.count({ where: { status: "AVAILABLE" } }),
    prisma.bloodUnit.count({ where: { status: "QUARANTINED" } }),
    prisma.bloodUnit.count({ where: { status: { in: ["RESERVED", "CROSSMATCHED"] } } }),
    prisma.bloodUnit.count({ where: { status: "ISSUED" } }),
    prisma.bloodUnit.count({ where: { status: "AVAILABLE", expiryDate: { lt: expiring } } }),
    prisma.bloodDonor.count({ where: { isActive: true } }),
    prisma.bloodDonation.count({ where: { donationDate: { gte: startOfToday } } }),
    prisma.bloodUnit.count(),
  ]);

  return { available, quarantined, reserved, issued, expiringSoon, donorCount, donationsToday, totalUnits };
}

export const BLOOD_GROUPS: Array<{ value: BloodGroup; key: string }> = [
  { value: "A_POS", key: "A+" },
  { value: "A_NEG", key: "A-" },
  { value: "B_POS", key: "B+" },
  { value: "B_NEG", key: "B-" },
  { value: "AB_POS", key: "AB+" },
  { value: "AB_NEG", key: "AB-" },
  { value: "O_POS", key: "O+" },
  { value: "O_NEG", key: "O-" },
  { value: "UNKNOWN", key: "Unknown" },
];

export const BLOOD_UNIT_STATUSES: Array<{ value: BloodUnitStatus; key: string; variant: string }> = [
  { value: "QUARANTINED", key: "bloodbank.statusQuarantined", variant: "warning" },
  { value: "AVAILABLE", key: "bloodbank.statusAvailable", variant: "success" },
  { value: "RESERVED", key: "bloodbank.statusReserved", variant: "info" },
  { value: "CROSSMATCHED", key: "bloodbank.statusCrossmatched", variant: "info" },
  { value: "ISSUED", key: "bloodbank.statusIssued", variant: "default" },
  { value: "EXPIRED", key: "bloodbank.statusExpired", variant: "muted" },
  { value: "WASTED", key: "bloodbank.statusWasted", variant: "destructive" },
  { value: "RETURNED", key: "bloodbank.statusReturned", variant: "outline" },
];
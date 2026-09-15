import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getLocations = cache(async () => {
  const governorates = await prisma.governorate.findMany({
    orderBy: { nameAr: "asc" },
    include: {
      cities: { orderBy: { nameAr: "asc" }, select: { id: true, nameAr: true, nameEn: true } },
    },
  });
  return governorates.map((g) => ({
    id: g.id,
    nameAr: g.nameAr,
    nameEn: g.nameEn,
    cities: g.cities.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn })),
  }));
});

export const getPatientList = cache(async (branchId?: string | null) => {
  const patients = await prisma.patient.findMany({
    where: { deletedAt: null, ...(branchId ? { branchId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      governorate: { select: { nameAr: true, nameEn: true } },
      city: { select: { nameAr: true, nameEn: true } },
      _count: { select: { appointments: true, encounters: true, invoices: true } },
    },
  });
  const total = await prisma.patient.count({
    where: { deletedAt: null, ...(branchId ? { branchId } : {}) },
  });
  return { patients, total };
});

export const getPatientById = cache(async (id: string) => {
  return prisma.patient.findUnique({
    where: { id },
    include: {
      governorate: { select: { nameAr: true, nameEn: true } },
      city: { select: { nameAr: true, nameEn: true } },
      insuranceCompany: { select: { nameAr: true, nameEn: true } },
      insuranceScheme: { select: { nameAr: true, nameEn: true } },
      allergies: { orderBy: { recordedAt: "desc" } },
      createdByIdUser: { select: { nameAr: true, nameEn: true } },
      documents: { orderBy: { createdAt: "desc" }, take: 50 },
      _count: {
        select: {
          appointments: true,
          encounters: true,
          admissions: true,
          prescriptions: true,
          labOrders: true,
          radOrders: true,
          invoices: true,
          payments: true,
        },
      },
    },
  });
});

export type PatientRow = Awaited<ReturnType<typeof getPatientList>>["patients"][number];

export const getPatientTimeline = cache(async (id: string) => {
  const [appointments, encounters, invoices, admissions] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: id },
      orderBy: { scheduledAt: "desc" },
      take: 50,
      include: {
        doctor: { select: { nameAr: true, nameEn: true, specialty: { select: { nameAr: true, nameEn: true } } } },
      },
    }),
    prisma.encounter.findMany({
      where: { patientId: id },
      orderBy: { startedAt: "desc" },
      take: 50,
      include: {
        doctor: { select: { nameAr: true, nameEn: true, specialty: { select: { nameAr: true, nameEn: true } } } },
      },
    }),
    prisma.invoice.findMany({
      where: { patientId: id },
      orderBy: { issuedAt: "desc" },
      take: 50,
    }),
    prisma.admission.findMany({
      where: { patientId: id, dischargedAt: null },
      orderBy: { admittedAt: "desc" },
      take: 10,
      include: {
        room: { select: { nameAr: true, nameEn: true } },
        bed: { select: { code: true } },
      },
    }),
  ]);
  return { appointments, encounters, invoices, admissions };
});
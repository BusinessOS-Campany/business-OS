import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getEncounterBoard = cache(async () => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const encounters = await prisma.encounter.findMany({
    where: { createdAt: { gte: startOfDay }, status: { in: ["WAITING", "IN_PROGRESS"] } },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
      doctor: { select: { id: true, nameAr: true, nameEn: true } },
      department: { select: { id: true, nameAr: true, nameEn: true } },
    },
  });

  return encounters;
});

export const getUnattendedTickets = cache(async () => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.queueTicket.findMany({
    where: {
      createdAt: { gte: startOfDay },
      status: { in: ["WAITING", "CALLED", "IN_SERVICE"] },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
      department: { select: { id: true, nameAr: true, nameEn: true } },
      appointment: {
        select: {
          id: true,
          appointmentNo: true,
          scheduledAt: true,
          doctor: { select: { id: true, nameAr: true, nameEn: true } },
          encounter: { select: { id: true, encounterNo: true } },
        },
      },
    },
  });
});

export const getEncounterById = cache(async (id: string) => {
  return prisma.encounter.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          nameAr: true,
          nameEn: true,
          gender: true,
          age: true,
          phone: true,
          bloodGroup: true,
        },
      },
      doctor: { select: { id: true, nameAr: true, nameEn: true } },
      department: { select: { id: true, nameAr: true, nameEn: true } },
      appointment: { select: { id: true, appointmentNo: true, status: true } },
      admission: { select: { id: true, admissionNo: true, status: true } },
      diagnoses: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      vitals: {
        orderBy: { recordedAt: "desc" },
        take: 10,
        include: { recordedBy: { select: { id: true, nameAr: true, nameEn: true } } },
      },
      prescriptions: {
        orderBy: { createdAt: "desc" },
        include: {
          doctor: { select: { id: true, nameAr: true, nameEn: true } },
          items: true,
        },
      },
      labOrders: {
        orderBy: { createdAt: "desc" },
        include: {
          doctor: { select: { id: true, nameAr: true, nameEn: true } },
          items: { include: { test: { select: { id: true, code: true, nameAr: true, nameEn: true } } } },
        },
      },
      radOrders: {
        orderBy: { createdAt: "desc" },
        include: { doctor: { select: { id: true, nameAr: true, nameEn: true } }, report: true },
      },
    },
  });
});

export const getLabTests = cache(async () => {
  return prisma.labTest.findMany({
    where: { isActive: true },
    orderBy: { nameEn: "asc" },
    take: 200,
    select: { id: true, code: true, nameAr: true, nameEn: true, price: true, currency: true },
  });
});
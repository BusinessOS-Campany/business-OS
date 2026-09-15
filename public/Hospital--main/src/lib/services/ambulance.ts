import type { AmbulanceStatus, TripStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getAmbulances(opts: { status?: AmbulanceStatus; q?: string } = {}) {
  return prisma.ambulance.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q ? { OR: [{ code: { contains: opts.q, mode: "insensitive" as const } }, { plateNo: { contains: opts.q } }] } : {}),
    },
    include: { trips: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { code: "asc" },
    take: 100,
  });
}

export function getAmbulanceById(id: string) {
  return prisma.ambulance.findUnique({ where: { id } });
}

export function getTrips(opts: { status?: TripStatus; q?: string; limit?: number } = {}) {
  return prisma.ambulanceTrip.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { tripNo: { contains: opts.q, mode: "insensitive" as const } },
              { patientName: { contains: opts.q } },
              { patient: { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }, { mrn: { contains: opts.q } }] } },
              { pickupLocation: { contains: opts.q } },
            ],
          }
        : {}),
    },
    include: {
      ambulance: { select: { id: true, code: true, plateNo: true } },
      driver: { select: { id: true, nameAr: true, nameEn: true } },
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
    },
    orderBy: { dispatchedAt: "desc" },
    take: opts.limit ?? 100,
  });
}

export function getTripById(id: string) {
  return prisma.ambulanceTrip.findUnique({
    where: { id },
    include: {
      ambulance: { select: { id: true, code: true, plateNo: true, model: true } },
      driver: { select: { id: true, nameAr: true, nameEn: true, phone: true } },
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true, phone: true } },
    },
  });
}

export async function getDrivers() {
  return prisma.employee.findMany({
    where: { employeeType: "AMBULANCE_STAFF", employeeStatus: "ACTIVE" },
    select: { id: true, nameAr: true, nameEn: true },
    orderBy: { nameEn: "asc" },
    take: 100,
  });
}

export async function getAmbulanceStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [available, dispatched, transporting, maintenance, activeTrips, totalTrips, completedToday] = await Promise.all([
    prisma.ambulance.count({ where: { status: "AVAILABLE" } }),
    prisma.ambulance.count({ where: { status: { in: ["DISPATCHED", "EN_ROUTE", "ARRIVED", "TRANSPORTING"] } } }),
    prisma.ambulance.count({ where: { status: "TRANSPORTING" } }),
    prisma.ambulance.count({ where: { status: "MAINTENANCE" } }),
    prisma.ambulanceTrip.count({ where: { status: { in: ["DISPATCHED", "EN_ROUTE", "ARRIVED", "TRANSPORTING"] } } }),
    prisma.ambulanceTrip.count(),
    prisma.ambulanceTrip.count({ where: { status: "COMPLETED", completedAt: { gte: startOfToday } } }),
  ]);

  return { available, dispatched, transporting, maintenance, activeTrips, totalTrips, completedToday };
}
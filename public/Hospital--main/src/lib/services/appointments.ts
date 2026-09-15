import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getAppointments = cache(async (from: Date, to: Date) => {
  return prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: from, lte: to },
    },
    orderBy: { scheduledAt: "asc" },
    take: 500,
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
      doctor: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          specialty: { select: { id: true, nameAr: true, nameEn: true } },
        },
      },
      department: { select: { id: true, nameAr: true, nameEn: true } },
      room: { select: { id: true, nameAr: true, nameEn: true } },
      queueTicket: { select: { id: true, ticketNo: true, status: true } },
      createdBy: { select: { id: true, nameAr: true, nameEn: true } },
    },
  });
});

export const getAppointmentById = cache(async (id: string) => {
  return prisma.appointment.findUnique({
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
      doctor: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          specialty: { select: { id: true, nameAr: true, nameEn: true } },
        },
      },
      department: { select: { id: true, nameAr: true, nameEn: true } },
      room: { select: { id: true, nameAr: true, nameEn: true } },
      queueTicket: { select: { id: true, ticketNo: true, status: true } },
      encounter: {
        select: {
          id: true,
          encounterNo: true,
          status: true,
          startedAt: true,
        },
      },
      createdBy: { select: { id: true, nameAr: true, nameEn: true } },
    },
  });
});

export const getAppointmentPatients = cache(async () => {
  return prisma.patient.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      mrn: true,
      nameAr: true,
      nameEn: true,
      phone: true,
    },
  });
});

export const getDoctors = cache(async () => {
  return prisma.employee.findMany({
    where: {
      employeeType: "DOCTOR",
      employeeStatus: "ACTIVE",
    },
    orderBy: { nameEn: "asc" },
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      specialty: { select: { id: true, nameAr: true, nameEn: true } },
      department: { select: { id: true, nameAr: true, nameEn: true } },
    },
  });
});

export const getDepartments = cache(async () => {
  return prisma.department.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { nameEn: "asc" }],
    select: { id: true, nameAr: true, nameEn: true },
  });
});

export const getQueueTickets = cache(async (departmentId?: string) => {
  return prisma.queueTicket.findMany({
    where: {
      status: { in: ["WAITING", "CALLED", "IN_SERVICE"] },
      ...(departmentId ? { departmentId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 60,
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
      department: { select: { id: true, nameAr: true, nameEn: true } },
      appointment: { select: { id: true, scheduledAt: true } },
    },
  });
});
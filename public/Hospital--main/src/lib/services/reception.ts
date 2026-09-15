import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export interface QueueBoardItem {
  id: string;
  ticketNo: string;
  status: string;
  priority: string;
  patient: { id: string; mrn: string; nameAr: string; nameEn: string };
  department?: { id: string; nameAr: string; nameEn: string } | null;
  appointment?: { id: string; scheduledAt: Date; appointmentNo: string } | null;
  calledAt?: Date | null;
  createdAt: Date;
}

export const getQueueBoard = cache(
  async (departmentId?: string): Promise<{
    nowServing: QueueBoardItem | null;
    inService: QueueBoardItem[];
    waiting: QueueBoardItem[];
  }> => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const all = await prisma.queueTicket.findMany({
      where: {
        createdAt: { gte: startOfDay },
        status: { in: ["WAITING", "CALLED", "IN_SERVICE"] },
        ...(departmentId ? { departmentId } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
        department: { select: { id: true, nameAr: true, nameEn: true } },
        appointment: { select: { id: true, scheduledAt: true, appointmentNo: true } },
      },
    });

    const active = all.filter(
      (t) => t.status === "CALLED" || t.status === "IN_SERVICE"
    );
    const nowServing = active.find((t) => t.status === "IN_SERVICE") ?? active[0] ?? null;
    const inService = active.filter((t) => t.id !== nowServing?.id);
    const waiting = all.filter((t) => t.status === "WAITING");

    return {
      nowServing,
      inService,
      waiting,
    };
  }
);

export const getReceptionAppointments = cache(async () => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ["CANCELLED"] },
    },
    orderBy: { scheduledAt: "asc" },
    take: 200,
    include: {
      patient: { select: { id: true, mrn: true, nameAr: true, nameEn: true } },
      doctor: { select: { id: true, nameAr: true, nameEn: true } },
      department: { select: { id: true, nameAr: true, nameEn: true } },
      queueTicket: { select: { id: true, ticketNo: true, status: true } },
    },
  });
});
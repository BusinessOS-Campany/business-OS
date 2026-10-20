"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { nextNumber } from "@/lib/services/numbering";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";

const STATUS_FLOW: Record<string, string[]> = {
  SCHEDULED: ["CONFIRMED", "ARRIVED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["ARRIVED", "WAITING", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["WAITING", "IN_CONSULTATION", "COMPLETED", "NO_SHOW", "CANCELLED"],
  WAITING: ["IN_CONSULTATION", "COMPLETED", "NO_SHOW", "CANCELLED"],
  IN_CONSULTATION: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const APPT_TYPES = ["OUTPATIENT", "FOLLOW_UP", "EMERGENCY", "PROCEDURE", "INPATIENT"] as const;
const PRIORITIES = ["ROUTINE", "URGENT", "EMERGENCY", "STAT"] as const;

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export async function createAppointmentAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string; appointmentNo: string }>> {
  const user = await requirePermission("appointments", "create");

  const scheduledAt = str(formData, "scheduledAt") ?? "";
  const parsed = z
    .object({
      patientId: z.string().min(1),
      doctorId: z.string().optional(),
      departmentId: z.string().optional(),
      scheduledAt: z.string().min(1),
      durationMinutes: z.coerce.number().int().min(5).max(480).default(15),
      appointmentType: z.enum(APPT_TYPES).default("OUTPATIENT"),
      priority: z.enum(PRIORITIES).default("ROUTINE"),
      reason: z.string().optional(),
      notes: z.string().optional(),
    })
    .safeParse({
      patientId: str(formData, "patientId"),
      doctorId: str(formData, "doctorId"),
      departmentId: str(formData, "departmentId"),
      scheduledAt,
      durationMinutes: str(formData, "durationMinutes") ?? "15",
      appointmentType: str(formData, "appointmentType") ?? "OUTPATIENT",
      priority: str(formData, "priority") ?? "ROUTINE",
      reason: str(formData, "reason"),
      notes: str(formData, "notes"),
    });

  if (!parsed.success) return failure("common.error");

  const data = parsed.data;
  const start = new Date(data.scheduledAt);
  if (Number.isNaN(start.getTime())) return failure("common.error");
  const end = new Date(start.getTime() + data.durationMinutes * 60_000);

  const existingPatient = await prisma.patient.findUnique({
    where: { id: data.patientId, deletedAt: null },
    select: { id: true },
  });
  if (!existingPatient) return failure("common.notFound");

  if (data.doctorId) {
    const clashes = await prisma.appointment.findMany({
      where: {
        doctorId: data.doctorId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      select: { scheduledAt: true, durationMinutes: true },
    });
    const conflict = clashes.some((a) => {
      const aStart = a.scheduledAt.getTime();
      const aEnd = aStart + a.durationMinutes * 60_000;
      return aStart < end.getTime() && start.getTime() < aEnd;
    });
    if (conflict) return failure("appointments.conflict");
  }

  const appointmentNo = await nextNumber("appointment");

  try {
    const appointment = await prisma.appointment.create({
      data: {
        appointmentNo,
        patientId: data.patientId,
        doctorId: data.doctorId,
        departmentId: data.departmentId,
        scheduledAt: start,
        durationMinutes: data.durationMinutes,
        appointmentType: data.appointmentType,
        priority: data.priority,
        reason: data.reason,
        notes: data.notes,
        createdById: user.id,
      },
      select: { id: true, appointmentNo: true, patient: { select: { nameAr: true, nameEn: true } } },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "appointments",
      recordId: appointment.id,
      description: `${appointment.appointmentNo} · ${appointment.patient.nameAr || appointment.patient.nameEn}`,
    });

    return success(undefined, { id: appointment.id, appointmentNo });
  } catch (err) {
    console.error("createAppointmentAction failed", err);
    return failure("common.error");
  }
}

export async function setAppointmentStatusAction(
  id: string,
  nextStatus: string,
  _prev: ActionResult | null
): Promise<ActionResult> {
  const user = await requirePermission("appointments", "update");

  const statuses = ["SCHEDULED", "CONFIRMED", "ARRIVED", "WAITING", "IN_CONSULTATION", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
  if (!statuses.includes(nextStatus as (typeof statuses)[number])) {
    return failure("common.error");
  }
  const status = nextStatus as (typeof statuses)[number];

  try {
    const existing = await prisma.appointment.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) return failure("common.notFound");
    if (!STATUS_FLOW[existing.status].includes(status)) {
      return failure("common.error");
    }
    const ticketNo = status === "ARRIVED" ? await nextNumber("ticket") : null;

    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id }, data: { status } });

      if (status === "ARRIVED") {
        const existingTicket = await tx.queueTicket.findUnique({
          where: { appointmentId: id },
        });
        if (!existingTicket && ticketNo) {
          const appointment = await tx.appointment.findUnique({
            where: { id },
            select: { patientId: true, departmentId: true, priority: true },
          });
          if (appointment) {
            await tx.queueTicket.create({
              data: {
                ticketNo,
                patientId: appointment.patientId,
                appointmentId: id,
                departmentId: appointment.departmentId ?? undefined,
                priority: appointment.priority,
                issuedById: user.employeeId ?? undefined,
              },
            });
          }
        }
      } else if (["COMPLETED", "NO_SHOW", "CANCELLED"].includes(status)) {
        await tx.queueTicket.updateMany({
          where: { appointmentId: id, status: { in: ["WAITING", "CALLED", "IN_SERVICE"] } },
          data: { status: status === "COMPLETED" ? "COMPLETED" : "CANCELLED" },
        });
      }
    });

    await audit({
      userId: user.id,
      action: "status_change",
      module: "appointments",
      recordId: id,
      description: `→ ${nextStatus}`,
    });

    return success("common.updated");
  } catch (err) {
    console.error("setAppointmentStatusAction failed", err);
    return failure("common.error");
  }
}

export async function callQueueTicketAction(
  id: string,
  status: "CALLED" | "IN_SERVICE" | "COMPLETED" | "NO_SHOW" | "CANCELLED",
  _prev: ActionResult | null
): Promise<ActionResult> {
  const user = await requirePermission("reception", "update");
  const now = new Date();
  await prisma.queueTicket.update({
    where: { id },
    data: {
      status,
      calledAt: status === "CALLED" ? now : undefined,
      servedAt: status === "IN_SERVICE" ? now : undefined,
      completedAt: status === "COMPLETED" ? now : undefined,
      cancelledAt: status === "CANCELLED" ? now : undefined,
    },
  });
  await audit({
    userId: user.id,
    action: "call_ticket",
    module: "reception",
    recordId: id,
    description: `ticket ${status}`,
  });
  return success("common.updated");
}
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";
import type { AttendanceStatus, LeaveType } from "@prisma/client";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export async function markAttendanceAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("hr");

  const parsed = z
    .object({
      employeeId: z.string().min(1),
      date: z.string().min(1),
      status: z.string().optional(),
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
      note: z.string().optional(),
    })
    .safeParse({
      employeeId: str(formData, "employeeId"),
      date: str(formData, "date"),
      status: str(formData, "status"),
      checkIn: str(formData, "checkIn"),
      checkOut: str(formData, "checkOut"),
      note: str(formData, "note"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const employee = await prisma.employee.findUnique({ where: { id: parsed.data.employeeId } });
    if (!employee) return failure("common.notFound");

    const date = new Date(parsed.data.date);
    const status = (parsed.data.status as AttendanceStatus) ?? "PRESENT";
    const checkIn = parsed.data.checkIn ? new Date(`${parsed.data.date}T${parsed.data.checkIn}`) : null;
    const checkOut = parsed.data.checkOut ? new Date(`${parsed.data.date}T${parsed.data.checkOut}`) : null;

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: parsed.data.employeeId, date } },
    });

    const attendance = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: parsed.data.employeeId, date } },
      update: {
        status,
        checkIn: checkIn ?? undefined,
        checkOut: checkOut ?? undefined,
        note: parsed.data.note ?? null,
      },
      create: {
        employeeId: parsed.data.employeeId,
        date,
        status,
        checkIn,
        checkOut,
        note: parsed.data.note ?? null,
      },
    });

    await audit({
      userId: user.id,
      action: existing ? "update" : "create",
      module: "hr",
      recordId: attendance.id,
      description: `${employee.employeeNo} · ${parsed.data.date} → ${status}`,
    });
    return success(existing ? "common.updated" : "common.saved");
  } catch (err) {
    console.error("markAttendanceAction failed", err);
    return failure("common.error");
  }
}

export async function createShiftAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("hr");

  const parsed = z
    .object({
      nameAr: z.string().min(1),
      nameEn: z.string().min(1),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
    })
    .safeParse({
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      startTime: str(formData, "startTime"),
      endTime: str(formData, "endTime"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const shift = await prisma.shift.create({
      data: {
        nameAr: parsed.data.nameAr!,
        nameEn: parsed.data.nameEn!,
        startTime: parsed.data.startTime ?? "08:00",
        endTime: parsed.data.endTime ?? "16:00",
      },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "hr",
      recordId: shift.id,
      description: `${shift.nameAr} / ${shift.nameEn}`,
    });
    return success("common.saved");
  } catch (err) {
    console.error("createShiftAction failed", err);
    return failure("common.error");
  }
}

export async function assignShiftAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("hr");

  const parsed = z
    .object({
      employeeId: z.string().min(1),
      shiftId: z.string().min(1),
      date: z.string().min(1),
    })
    .safeParse({
      employeeId: str(formData, "employeeId"),
      shiftId: str(formData, "shiftId"),
      date: str(formData, "date"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const employee = await prisma.employee.findUnique({ where: { id: parsed.data.employeeId } });
    const shift = await prisma.shift.findUnique({ where: { id: parsed.data.shiftId } });
    if (!employee || !shift) return failure("common.notFound");

    const assignment = await prisma.employeeShift.create({
      data: {
        employeeId: parsed.data.employeeId,
        shiftId: parsed.data.shiftId,
        date: new Date(parsed.data.date),
      },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "hr",
      recordId: assignment.id,
      description: `${employee.employeeNo} · ${shift.nameEn} · ${parsed.data.date}`,
    });
    return success("common.saved");
  } catch (err) {
    console.error("assignShiftAction failed", err);
    return failure("common.error");
  }
}

export async function createLeaveRequestAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("hr");

  const parsed = z
    .object({
      employeeId: z.string().min(1),
      leaveType: z.string().optional(),
      startDate: z.string().min(1),
      endDate: z.string().min(1),
      reason: z.string().optional(),
    })
    .safeParse({
      employeeId: str(formData, "employeeId"),
      leaveType: str(formData, "leaveType"),
      startDate: str(formData, "startDate"),
      endDate: str(formData, "endDate"),
      reason: str(formData, "reason"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const employee = await prisma.employee.findUnique({ where: { id: parsed.data.employeeId } });
    if (!employee) return failure("common.notFound");

    const start = new Date(parsed.data.startDate);
    const end = new Date(parsed.data.endDate);
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    if (days < 1) return failure("common.error");

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: parsed.data.employeeId,
        leaveType: (parsed.data.leaveType as LeaveType) ?? "ANNUAL",
        startDate: start,
        endDate: end,
        days,
        reason: parsed.data.reason,
      },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "hr",
      recordId: leave.id,
      description: `${employee.employeeNo} · ${leave.leaveType} · ${days}d`,
    });
    return success("common.saved");
  } catch (err) {
    console.error("createLeaveRequestAction failed", err);
    return failure("common.error");
  }
}

export async function decideLeaveAction(
  leaveId: string,
  decision: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("hr");

  if (decision !== "APPROVED" && decision !== "REJECTED") return failure("common.error");

  try {
    const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
    if (!leave) return failure("common.notFound");
    if (leave.status !== "PENDING") return failure("common.error");

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: decision,
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    await audit({
      userId: user.id,
      action: "update",
      module: "hr",
      recordId: leaveId,
      description: `${leave.employeeId} → ${decision}`,
    });
    return success(decision === "APPROVED" ? "hr.statusApproved" : "hr.statusRejected");
  } catch (err) {
    console.error("decideLeaveAction failed", err);
    return failure("common.error");
  }
}
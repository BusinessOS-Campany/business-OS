"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";
import { nextNumber } from "@/lib/services/numbering";
import type { SurgeryStatus } from "@prisma/client";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

const TRANSITIONS: Record<string, string[]> = {
  PRE_OP: ["SCHEDULED"],
  IN_PROGRESS: ["SCHEDULED", "PRE_OP"],
  COMPLETED: ["IN_PROGRESS", "POST_OP"],
  POST_OP: ["IN_PROGRESS", "COMPLETED"],
  CANCELLED: ["SCHEDULED", "PRE_OP", "IN_PROGRESS"],
};

export async function createSurgeryAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("surgery");

  const parsed = z
    .object({
      patientId: z.string().min(1),
      procedureNameAr: z.string().min(1),
      procedureNameEn: z.string().optional(),
      operatingRoomId: z.string().optional(),
      surgeonId: z.string().optional(),
      anesthesiologistId: z.string().optional(),
      scheduledAt: z.string().optional(),
      surgeryNotes: z.string().optional(),
      preOpChecklist: z.string().optional(),
    })
    .safeParse({
      patientId: str(formData, "patientId"),
      procedureNameAr: str(formData, "procedureNameAr"),
      procedureNameEn: str(formData, "procedureNameEn"),
      operatingRoomId: str(formData, "operatingRoomId"),
      surgeonId: str(formData, "surgeonId"),
      anesthesiologistId: str(formData, "anesthesiologistId"),
      scheduledAt: str(formData, "scheduledAt"),
      surgeryNotes: str(formData, "surgeryNotes"),
      preOpChecklist: str(formData, "preOpChecklist"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const patient = await prisma.patient.findUnique({ where: { id: parsed.data.patientId } });
    if (!patient) return failure("common.notFound");

    const surgeryNo = await nextNumber("surgery");
    const surgery = await prisma.surgery.create({
      data: {
        surgeryNo,
        patientId: parsed.data.patientId,
        procedureNameAr: parsed.data.procedureNameAr,
        procedureNameEn: parsed.data.procedureNameEn,
        operatingRoomId: parsed.data.operatingRoomId,
        surgeonId: parsed.data.surgeonId,
        anesthesiologistId: parsed.data.anesthesiologistId,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        intraoperativeNotes: parsed.data.surgeryNotes,
        preOpChecklist: parsed.data.preOpChecklist,
      },
    });

    await audit({ userId: user.id, action: "create", module: "surgery", recordId: surgery.id, description: surgeryNo });
    return success("common.saved", { id: surgery.id });
  } catch (err) {
    console.error("createSurgeryAction failed", err);
    return failure("common.error");
  }
}

export async function updateSurgeryStatusAction(
  surgeryId: string,
  newStatus: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("surgery");

  try {
    const surgery = await prisma.surgery.findUnique({ where: { id: surgeryId } });
    if (!surgery) return failure("common.notFound");
    if (!TRANSITIONS[newStatus]?.includes(surgery.status)) return failure("surgery.invalidTransition");

    const data: Record<string, unknown> = { status: newStatus };
    if (newStatus === "IN_PROGRESS") data.startedAt = new Date();
    if (newStatus === "COMPLETED") data.endedAt = new Date();
    if (newStatus === "POST_OP") data.recoveryNotes = str(formData, "recoveryNotes");

    await prisma.surgery.update({ where: { id: surgeryId }, data });
    await audit({
      userId: user.id,
      action: newStatus === "CANCELLED" ? "delete" : "update",
      module: "surgery",
      recordId: surgeryId,
      description: `${surgery.surgeryNo} → ${newStatus}`,
    });
    return success("common.updated");
  } catch (err) {
    console.error("updateSurgeryStatusAction failed", err);
    return failure("common.error");
  }
}
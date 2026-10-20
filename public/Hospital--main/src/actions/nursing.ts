"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function num(formData: FormData, key: string): number | undefined {
  const v = str(formData, key);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function addNursingNoteAction(
  admissionId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("nursing", "create");

  const category = str(formData, "category") ?? "GENERAL";
  const note = str(formData, "note");

  if (!note) return failure("common.error");

  const parsed = z
    .object({
      category: z.enum(["GENERAL", "ROUND", "PAIN", "WOUND", "IO", "DISCHARGE"]),
      note: z.string().min(1),
    })
    .safeParse({ category, note });

  if (!parsed.success) return failure("common.error");

  try {
    const admission = await prisma.admission.findUnique({ where: { id: admissionId }, select: { id: true, admissionNo: true } });
    if (!admission) return failure("common.notFound");

    await prisma.nursingNote.create({
      data: {
        admissionId,
        category: parsed.data.category,
        note: parsed.data.note,
        authorId: user.employeeId ?? undefined,
      },
    });

    await audit({ userId: user.id, action: "create", module: "nursing", recordId: admissionId, description: `${admission.admissionNo} note` });
    return success("common.saved");
  } catch (err) {
    console.error("addNursingNoteAction failed", err);
    return failure("common.error");
  }
}

export async function updateMarStatusAction(
  administrationId: string,
  newStatus: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("nursing");

  const parsed = z.enum(["GIVEN", "OMITTED", "REFUSED", "HOLD", "SKIPPED"]).safeParse(newStatus);
  if (!parsed.success) return failure("common.error");

  try {
    const admin = await prisma.medAdministration.findUnique({
      where: { id: administrationId },
      select: { id: true, medicationName: true },
    });
    if (!admin) return failure("common.notFound");

    await prisma.medAdministration.update({
      where: { id: administrationId },
      data: {
        marStatus: parsed.data,
        givenAt: parsed.data === "GIVEN" ? new Date() : null,
        givenById: user.employeeId ?? undefined,
        doseGiven: str(formData, "doseGiven"),
      },
    });

    await audit({ userId: user.id, action: "update", module: "nursing", recordId: administrationId, description: `${admin.medicationName} → ${parsed.data}` });
    return success("common.updated");
  } catch (err) {
    console.error("updateMarStatusAction failed", err);
    return failure("common.error");
  }
}

export async function addFluidItemAction(
  admissionId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("nursing", "create");

  const parsed = z
    .object({
      type: z.enum(["INTAKE", "OUTPUT"]),
      category: z.string().min(1),
      amount: z.number().positive(),
    })
    .safeParse({
      type: str(formData, "type") ?? "INTAKE",
      category: str(formData, "category"),
      amount: num(formData, "amount"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      select: { id: true, admissionNo: true, patientId: true },
    });
    if (!admission) return failure("common.notFound");

    await prisma.fluidBalanceItem.create({
      data: {
        admissionId,
        patientId: admission.patientId,
        type: parsed.data.type,
        category: parsed.data.category,
        amount: parsed.data.amount,
        recordedById: user.employeeId ?? undefined,
      },
    });

    await audit({ userId: user.id, action: "create", module: "nursing", recordId: admissionId, description: `${admission.admissionNo} fluid ${parsed.data.type}` });
    return success("common.saved");
  } catch (err) {
    console.error("addFluidItemAction failed", err);
    return failure("common.error");
  }
}
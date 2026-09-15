"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { nextNumber } from "@/lib/services/numbering";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";

const DIAGNOSIS_TYPES = ["PRIMARY", "SECONDARY", "DIFFERENTIAL", "ADMISSION", "DISCHARGE"] as const;
const RAD_MODALITIES = ["XRAY", "CT", "MRI", "ULTRASOUND", "MAMMOGRAPHY", "FLUOROSCOPY", "PET", "OTHER"] as const;
const PRIORITIES = ["ROUTINE", "URGENT", "EMERGENCY", "STAT"] as const;

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

function jsonArray(formData: FormData, key: string): Record<string, unknown>[] {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function startEncounterAction(
  ticketId: string,
  patientId: string,
  appointmentId: string | null,
  departmentId: string | null,
  _prev: ActionResult<{ id: string }> | null
): Promise<ActionResult<{ id: string; encounterNo: string }>> {
  const user = await requirePermission("encounters", "create");

  try {
    const existingEncounter = appointmentId
      ? await prisma.encounter.findUnique({
          where: { appointmentId },
          select: { id: true },
        })
      : null;
    if (existingEncounter) return failure("encounters.alreadyStarted");

    const encounterNo = await nextNumber("encounter");

    const encounter = await prisma.$transaction(async (tx) => {
      const enc = await tx.encounter.create({
        data: {
          encounterNo,
          patientId,
          doctorId: user.employeeId ?? undefined,
          departmentId: departmentId ?? undefined,
          appointmentId: appointmentId ?? undefined,
          encounterType: "OUTPATIENT",
          status: "IN_PROGRESS",
          startedAt: new Date(),
          createdById: user.id,
        },
        select: { id: true, encounterNo: true },
      });

      if (appointmentId) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: "IN_CONSULTATION" },
        });
      }
      if (ticketId) {
        await tx.queueTicket.update({
          where: { id: ticketId },
          data: { status: "IN_SERVICE", servedAt: new Date() },
        });
      }

      return enc;
    });

    await audit({
      userId: user.id,
      action: "start_encounter",
      module: "encounters",
      recordId: encounter.id,
      description: encounter.encounterNo,
    });

    return success(undefined, { id: encounter.id, encounterNo });
  } catch (err) {
    console.error("startEncounterAction failed", err);
    return failure("common.error");
  }
}

export async function saveClinicalNotesAction(
  encounterId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("encounters", "edit");

  try {
    const existing = await prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { id: true },
    });
    if (!existing) return failure("common.notFound");

    await prisma.encounter.update({
      where: { id: encounterId },
      data: {
        chiefComplaint: str(formData, "chiefComplaint"),
        hpi: str(formData, "hpi"),
        pastMedicalHistory: str(formData, "pastMedicalHistory"),
        surgicalHistory: str(formData, "surgicalHistory"),
        familyHistory: str(formData, "familyHistory"),
        socialHistory: str(formData, "socialHistory"),
        examination: str(formData, "examination"),
        assessment: str(formData, "assessment"),
        plan: str(formData, "plan"),
        clinicalNotes: str(formData, "clinicalNotes"),
      },
    });

    await audit({ userId: user.id, action: "edit", module: "encounters", recordId: encounterId, description: "clinical notes" });
    return success("common.updated");
  } catch (err) {
    console.error("saveClinicalNotesAction failed", err);
    return failure("common.error");
  }
}

export async function addDiagnosisAction(
  encounterId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("encounters", "edit");

  const parsed = z
    .object({
      code: z.string().optional(),
      nameAr: z.string().min(1),
      nameEn: z.string().optional(),
      dxType: z.enum(DIAGNOSIS_TYPES).default("PRIMARY"),
      isPrimary: z.boolean().default(false),
    })
    .safeParse({
      code: str(formData, "code"),
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      dxType: str(formData, "dxType") ?? "PRIMARY",
      isPrimary: formData.get("isPrimary") === "1",
    });

  if (!parsed.success) return failure("common.error");

  try {
    const enc = await prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { patientId: true },
    });
    if (!enc) return failure("common.notFound");

    await prisma.$transaction(async (tx) => {
      if (parsed.data.isPrimary) {
        await tx.diagnosis.updateMany({
          where: { encounterId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      await tx.diagnosis.create({
        data: {
          patientId: enc.patientId,
          encounterId,
          code: parsed.data.code,
          nameAr: parsed.data.nameAr,
          nameEn: parsed.data.nameEn,
          dxType: parsed.data.dxType,
          isPrimary: parsed.data.isPrimary,
          createdById: user.id,
        },
      });
    });

    await audit({ userId: user.id, action: "create", module: "encounters", recordId: encounterId, description: "diagnosis" });
    return success("common.saved");
  } catch (err) {
    console.error("addDiagnosisAction failed", err);
    return failure("common.error");
  }
}

export async function removeDiagnosisAction(
  diagnosisId: string,
  _prev: ActionResult | null
): Promise<ActionResult> {
  const user = await requirePermission("encounters", "edit");
  try {
    await prisma.diagnosis.delete({ where: { id: diagnosisId } });
    await audit({ userId: user.id, action: "delete", module: "encounters", recordId: diagnosisId, description: "diagnosis" });
    return success("common.deleted");
  } catch (err) {
    console.error("removeDiagnosisAction failed", err);
    return failure("common.error");
  }
}

export async function addVitalsAction(
  encounterId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("vitals", "create");

  try {
    const enc = await prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { patientId: true },
    });
    if (!enc) return failure("common.notFound");

    const weight = num(formData, "weight");
    const height = num(formData, "height");
    const bmi =
      weight !== undefined && height && height > 0
        ? Math.round((weight / Math.pow(height / 100, 2)) * 100) / 100
        : null;

    await prisma.vitalSign.create({
      data: {
        patientId: enc.patientId,
        encounterId,
        recordedById: user.employeeId ?? undefined,
        temperature: num(formData, "temperature"),
        pulse: num(formData, "pulse"),
        respiratoryRate: num(formData, "respiratoryRate"),
        systolic: num(formData, "systolic"),
        diastolic: num(formData, "diastolic"),
        o2sat: num(formData, "o2sat"),
        weight: weight ?? undefined,
        height: height ?? undefined,
        bmi: bmi ?? undefined,
        bloodGlucose: num(formData, "bloodGlucose"),
        painScore: num(formData, "painScore"),
        consciousness: str(formData, "consciousness"),
        notes: str(formData, "notes"),
      },
    });

    await audit({ userId: user.id, action: "create", module: "vitals", recordId: encounterId, description: "vital signs" });
    return success("common.saved");
  } catch (err) {
    console.error("addVitalsAction failed", err);
    return failure("common.error");
  }
}

export async function addPrescriptionAction(
  encounterId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("prescriptions", "create");

  const items = jsonArray(formData, "items");
  const validItems = items.slice(0, 50)
    .filter((it) => typeof it.medicineNameAr === "string" && String(it.medicineNameAr).trim() !== "")
    .map((it) => ({
      medicineNameAr: String(it.medicineNameAr).trim(),
      medicineNameEn: typeof it.medicineNameEn === "string" ? String(it.medicineNameEn).trim() : "",
      dosage: typeof it.dosage === "string" ? it.dosage : null,
      route: typeof it.route === "string" ? it.route : null,
      frequency: typeof it.frequency === "string" ? it.frequency : null,
      duration: typeof it.duration === "string" ? it.duration : null,
      quantity: Math.max(1, Math.min(9999, Number(it.quantity) || 1)),
      unit: typeof it.unit === "string" ? it.unit : null,
      instructions: typeof it.instructions === "string" ? it.instructions : null,
    }));

  if (validItems.length === 0) return failure("common.error");

  try {
    const enc = await prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { patientId: true },
    });
    if (!enc) return failure("common.notFound");

    const prescriptionNo = await nextNumber("prescription");

    await prisma.prescription.create({
      data: {
        prescriptionNo,
        patientId: enc.patientId,
        encounterId,
        doctorId: user.employeeId ?? undefined,
        status: "ACTIVE",
        instructions: str(formData, "instructions"),
        items: { create: validItems },
      },
    });

    await audit({ userId: user.id, action: "create", module: "prescriptions", recordId: encounterId, description: prescriptionNo });
    return success("common.saved");
  } catch (err) {
    console.error("addPrescriptionAction failed", err);
    return failure("common.error");
  }
}

export async function orderLabAction(
  encounterId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("laboratory", "create");

  const testIds = jsonArray(formData, "testIds").map((t) => String(t.id)).filter(Boolean).slice(0, 30);
  const parsed = z
    .object({
      priority: z.enum(PRIORITIES).default("ROUTINE"),
      clinicalNote: z.string().optional(),
    })
    .safeParse({
      priority: str(formData, "priority") ?? "ROUTINE",
      clinicalNote: str(formData, "clinicalNote"),
    });

  if (!parsed.success || testIds.length === 0) return failure("common.error");

  try {
    const enc = await prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { patientId: true },
    });
    if (!enc) return failure("common.notFound");

    const orderNo = await nextNumber("lab");

    await prisma.labOrder.create({
      data: {
        orderNo,
        patientId: enc.patientId,
        encounterId,
        doctorId: user.employeeId ?? undefined,
        priority: parsed.data.priority,
        clinicalNote: parsed.data.clinicalNote,
        items: { create: testIds.map((testId) => ({ testId })) },
      },
    });

    await audit({ userId: user.id, action: "create", module: "laboratory", recordId: encounterId, description: orderNo });
    return success("common.saved");
  } catch (err) {
    console.error("orderLabAction failed", err);
    return failure("common.error");
  }
}

export async function orderRadAction(
  encounterId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("radiology", "create");

  const parsed = z
    .object({
      modality: z.enum(RAD_MODALITIES).default("XRAY"),
      bodyPart: z.string().optional(),
      clinicalNote: z.string().optional(),
    })
    .safeParse({
      modality: str(formData, "modality") ?? "XRAY",
      bodyPart: str(formData, "bodyPart"),
      clinicalNote: str(formData, "clinicalNote"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const enc = await prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { patientId: true },
    });
    if (!enc) return failure("common.notFound");

    const orderNo = await nextNumber("radiology");

    await prisma.radiologyOrder.create({
      data: {
        orderNo,
        patientId: enc.patientId,
        encounterId,
        doctorId: user.employeeId ?? undefined,
        modality: parsed.data.modality,
        bodyPart: parsed.data.bodyPart,
        clinicalNote: parsed.data.clinicalNote,
      },
    });

    await audit({ userId: user.id, action: "create", module: "radiology", recordId: encounterId, description: orderNo });
    return success("common.saved");
  } catch (err) {
    console.error("orderRadAction failed", err);
    return failure("common.error");
  }
}

export async function completeEncounterAction(
  encounterId: string,
  _prev: ActionResult | null
): Promise<ActionResult> {
  const user = await requirePermission("encounters", "edit");

  try {
    const enc = await prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { appointmentId: true, patientId: true },
    });
    if (!enc) return failure("common.notFound");

    await prisma.$transaction(async (tx) => {
      await tx.encounter.update({
        where: { id: encounterId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      if (enc.appointmentId) {
        await tx.appointment.update({
          where: { id: enc.appointmentId },
          data: { status: "COMPLETED" },
        });
        await tx.queueTicket.updateMany({
          where: { appointmentId: enc.appointmentId, status: { in: ["WAITING", "CALLED", "IN_SERVICE"] } },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }
    });

    await audit({ userId: user.id, action: "complete", module: "encounters", recordId: encounterId, description: "encounter completed" });
    return success("common.updated");
  } catch (err) {
    console.error("completeEncounterAction failed", err);
    return failure("common.error");
  }
}
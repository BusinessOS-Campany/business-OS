"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";
import { nextNumber } from "@/lib/services/numbering";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export async function createAdmissionAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("admissions", "create");

  const parsed = z
    .object({
      patientId: z.string().min(1),
      departmentId: z.string().optional(),
      bedId: z.string().optional(),
      attendingDoctorId: z.string().optional(),
      admissionType: z.enum(["EMERGENCY", "PLANNED", "TRANSFER"]).default("PLANNED"),
      isIcu: z.boolean().optional(),
      provisionalDiagnosis: z.string().optional(),
      carePlan: z.string().optional(),
      expectedDischargeAt: z.string().optional(),
    })
    .safeParse({
      patientId: str(formData, "patientId"),
      departmentId: str(formData, "departmentId"),
      bedId: str(formData, "bedId"),
      attendingDoctorId: str(formData, "attendingDoctorId"),
      admissionType: str(formData, "admissionType") ?? "PLANNED",
      isIcu: formData.get("isIcu") === "on",
      provisionalDiagnosis: str(formData, "provisionalDiagnosis"),
      carePlan: str(formData, "carePlan"),
      expectedDischargeAt: str(formData, "expectedDischargeAt"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const patient = await prisma.patient.findUnique({ where: { id: parsed.data.patientId }, select: { id: true } });
    if (!patient) return failure("common.notFound");

    const admissionNo = await nextNumber("admission", user.branchId ?? "MAIN");

    const admission = await prisma.$transaction(async (tx) => {
      let bedId = parsed.data.bedId;
      if (bedId) {
        const bed = await tx.bed.findUnique({
          where: { id: bedId },
          select: { status: true, isActive: true },
        });
        if (!bed || !bed.isActive || bed.status !== "AVAILABLE") return null;
        await tx.bed.update({ where: { id: bedId }, data: { status: "OCCUPIED" } });
      }
      return tx.admission.create({
        data: {
          admissionNo,
          patientId: parsed.data.patientId,
          departmentId: parsed.data.departmentId,
          bedId,
          attendingDoctorId: parsed.data.attendingDoctorId,
          admissionType: parsed.data.admissionType,
          isIcu: parsed.data.isIcu ?? false,
          provisionalDiagnosis: parsed.data.provisionalDiagnosis,
          carePlan: parsed.data.carePlan,
          expectedDischargeAt: parsed.data.expectedDischargeAt ? new Date(parsed.data.expectedDischargeAt) : null,
          admittedAt: new Date(),
        },
        select: { id: true },
      });
    });

    if (!admission) return failure("admissions.bedNotAvailable");

    await audit({ userId: user.id, action: "create", module: "admissions", recordId: admission.id, description: admissionNo });
    return success("common.saved", { id: admission.id });
  } catch (err) {
    console.error("createAdmissionAction failed", err);
    return failure("common.error");
  }
}

export async function dischargeAdmissionAction(
  admissionId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("admissions");

  const dischargeType = str(formData, "dischargeType");
  const dischargeSummary = str(formData, "dischargeSummary");
  const parsedType = z.enum(["RECOVERED", "REFERRED", "AGAINST_MEDICAL_ADVICE", "TRANSFERRED", "DECEASED", "OTHER"]).safeParse(dischargeType);
  if (!parsedType.success) return failure("common.error");

  try {
    const admission = await prisma.admission.findUnique({ where: { id: admissionId }, select: { id: true, admissionNo: true, status: true, bedId: true } });
    if (!admission) return failure("common.notFound");
    if (admission.status !== "ADMITTED") return failure("common.error");

    await prisma.$transaction(async (tx) => {
      await tx.admission.update({
        where: { id: admissionId },
        data: {
          status: "DISCHARGED",
          dischargeType: parsedType.data,
          dischargeSummary,
          dischargedAt: new Date(),
          dischargedById: user.employeeId ?? undefined,
        },
      });
      if (admission.bedId) {
        await tx.bed.update({ where: { id: admission.bedId }, data: { status: "AVAILABLE" } });
      }
    });

    await audit({ userId: user.id, action: "update", module: "admissions", recordId: admissionId, description: `${admission.admissionNo} → DISCHARGED` });
    return success("common.updated");
  } catch (err) {
    console.error("dischargeAdmissionAction failed", err);
    return failure("common.error");
  }
}

export async function cancelAdmissionAction(
  admissionId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("admissions");

  try {
    const admission = await prisma.admission.findUnique({ where: { id: admissionId }, select: { id: true, admissionNo: true, status: true, bedId: true } });
    if (!admission) return failure("common.notFound");
    if (admission.status !== "ADMITTED") return failure("common.error");

    await prisma.$transaction(async (tx) => {
      await tx.admission.update({ where: { id: admissionId }, data: { status: "CANCELLED", dischargedAt: new Date() } });
      if (admission.bedId) {
        await tx.bed.update({ where: { id: admission.bedId }, data: { status: "AVAILABLE" } });
      }
    });

    await audit({ userId: user.id, action: "delete", module: "admissions", recordId: admissionId, description: `${admission.admissionNo} → CANCELLED` });
    return success("common.updated");
  } catch (err) {
    console.error("cancelAdmissionAction failed", err);
    return failure("common.error");
  }
}

export async function updateCarePlanAction(
  admissionId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("admissions");

  try {
    const admission = await prisma.admission.findUnique({ where: { id: admissionId }, select: { id: true, admissionNo: true } });
    if (!admission) return failure("common.notFound");

    await prisma.admission.update({
      where: { id: admissionId },
      data: {
        provisionalDiagnosis: str(formData, "provisionalDiagnosis"),
        carePlan: str(formData, "carePlan"),
      },
    });

    await audit({ userId: user.id, action: "update", module: "admissions", recordId: admissionId, description: `${admission.admissionNo} care plan` });
    return success("admissions.carePlanUpdated");
  } catch (err) {
    console.error("updateCarePlanAction failed", err);
    return failure("common.error");
  }
}
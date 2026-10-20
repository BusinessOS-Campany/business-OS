"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";
import { nextNumber } from "@/lib/services/numbering";
import type { BloodGroup, BloodUnitStatus } from "@prisma/client";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

const BLOOD_GROUP_VALUES = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG", "UNKNOWN"] as const;

export async function createDonorAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("bloodbank");

  const parsed = z
    .object({
      nameAr: z.string().min(1),
      nameEn: z.string().min(1),
      phone: z.string().optional(),
      gender: z.string().optional(),
      bloodGroup: z.string().optional(),
      identityNo: z.string().optional(),
    })
    .safeParse({
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      phone: str(formData, "phone"),
      gender: str(formData, "gender"),
      bloodGroup: str(formData, "bloodGroup") ?? "UNKNOWN",
      identityNo: str(formData, "identityNo"),
    });

  if (!parsed.success) return failure("common.error");
  if (!BLOOD_GROUP_VALUES.includes(parsed.data.bloodGroup as BloodGroup)) return failure("common.error");

  try {
    const donor = await prisma.bloodDonor.create({
      data: {
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        phone: parsed.data.phone,
        gender: parsed.data.gender as never,
        bloodGroup: parsed.data.bloodGroup as BloodGroup,
        identityNo: parsed.data.identityNo,
      },
    });
    await audit({ userId: user.id, action: "create", module: "bloodbank", recordId: donor.id, description: donor.nameEn });
    return success("common.saved", { id: donor.id });
  } catch (err) {
    console.error("createDonorAction failed", err);
    return failure("common.error");
  }
}

export async function recordDonationAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("bloodbank");

  const parsed = z
    .object({
      donorId: z.string().min(1),
      patientId: z.string().optional(),
      units: z.coerce.number().int().min(1).max(4),
      hemoglobin: z.coerce.number().min(0).optional(),
      notes: z.string().optional(),
    })
    .safeParse({
      donorId: str(formData, "donorId"),
      patientId: str(formData, "patientId"),
      units: Number(formData.get("units") ?? 1),
      hemoglobin: Number(formData.get("hemoglobin")),
      notes: str(formData, "notes"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const donor = await prisma.bloodDonor.findUnique({ where: { id: parsed.data.donorId } });
    if (!donor) return failure("common.notFound");

    const donation = await prisma.bloodDonation.create({
      data: {
        donorId: parsed.data.donorId,
        patientId: parsed.data.patientId || undefined,
        units: parsed.data.units,
        hemoglobin: parsed.data.hemoglobin,
        notes: parsed.data.notes,
      },
    });

    // Create blood units
    const unitsData = Array.from({ length: parsed.data.units }, (_, i) => ({
      donationId: donation.id,
      unitNo: `BLD-${Date.now().toString(36).toUpperCase()}-${i + 1}`,
      bloodGroup: donor.bloodGroup,
    }));
    await prisma.bloodUnit.createMany({ data: unitsData });

    await audit({ userId: user.id, action: "create", module: "bloodbank", recordId: donation.id, description: `Donation ${parsed.data.units}u` });
    return success("common.saved");
  } catch (err) {
    console.error("recordDonationAction failed", err);
    return failure("common.error");
  }
}

export async function updateBloodUnitStatusAction(
  unitId: string,
  newStatus: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("bloodbank");

  const allowed: Record<string, string[]> = {
    AVAILABLE: ["QUARANTINED"],
    CROSSMATCHED: ["AVAILABLE"],
    RESERVED: ["AVAILABLE"],
    ISSUED: ["RESERVED", "CROSSMATCHED"],
    WASTED: ["AVAILABLE", "QUARANTINED", "RESERVED", "EXPIRED"],
    RETURNED: ["ISSUED"],
    EXPIRED: ["AVAILABLE", "QUARANTINED"],
  };

  try {
    const unit = await prisma.bloodUnit.findUnique({ where: { id: unitId } });
    if (!unit) return failure("common.notFound");
    if (!allowed[newStatus]?.includes(unit.status)) return failure("bloodbank.invalidTransition");

    const data: Record<string, unknown> = { status: newStatus };
    if (newStatus === "EXPIRED") data.expiryDate = new Date();
    if (newStatus === "RESERVED") data.reservedForPatientId = str(formData, "reservedForPatientId") || undefined;

    await prisma.bloodUnit.update({ where: { id: unitId }, data });
    await audit({ userId: user.id, action: "update", module: "bloodbank", recordId: unitId, description: `${unit.unitNo} → ${newStatus}` });
    return success("common.updated");
  } catch (err) {
    console.error("updateBloodUnitStatusAction failed", err);
    return failure("common.error");
  }
}
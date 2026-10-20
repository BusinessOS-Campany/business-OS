"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { nextNumber } from "@/lib/services/numbering";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";

const patientSchema = z.object({
  nameAr: z.string().trim().min(2, { message: "required" }),
  nameEn: z.string().trim().min(2, { message: "required" }),
  gender: z.enum(["MALE", "FEMALE"]),
  dateOfBirth: z.string().optional(),
  nationalId: z.string().trim().optional(),
  passportNo: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  secondaryPhone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().email({ message: "invalid-email" }).optional().or(z.literal("")),
  governorateId: z.string().optional(),
  cityId: z.string().optional(),
  address: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactRelation: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  occupation: z.string().trim().optional(),
  maritalStatus: z.enum(["UNKNOWN", "SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).default("UNKNOWN"),
  nationality: z.string().trim().optional(),
  preferredLanguage: z.enum(["ar", "en"]).default("ar"),
  bloodGroup: z
    .enum([
      "UNKNOWN",
      "A_POS",
      "A_NEG",
      "B_POS",
      "B_NEG",
      "AB_POS",
      "AB_NEG",
      "O_POS",
      "O_NEG",
    ])
    .default("UNKNOWN"),
  visitSource: z
    .enum(["WALK_IN", "SCHEDULED", "REFERRAL", "EMERGENCY", "TRANSFER", "OTHER"])
    .default("WALK_IN"),
  referralSource: z.string().trim().optional(),
  insurancePolicyNo: z.string().trim().optional(),
  allergens: z.array(z.string()),
  reactions: z.array(z.string()),
  severities: z.array(z.enum(["MILD", "MODERATE", "SEVERE"])),
});

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function arr(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((v) => String(v).trim()).filter(Boolean);
}

function computeAge(dob: string): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export async function createPatientAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string; mrn: string }>> {
  const user = await requirePermission("patients", "create");

  const allergens = arr(formData, "allergens");
  const reactions = arr(formData, "reactions");
  const severities = arr(formData, "severities");

  const parsed = patientSchema.safeParse({
    nameAr: str(formData, "nameAr"),
    nameEn: str(formData, "nameEn"),
    gender: str(formData, "gender"),
    dateOfBirth: str(formData, "dateOfBirth"),
    nationalId: str(formData, "nationalId"),
    passportNo: str(formData, "passportNo"),
    phone: str(formData, "phone"),
    secondaryPhone: str(formData, "secondaryPhone"),
    whatsapp: str(formData, "whatsapp"),
    email: str(formData, "email"),
    governorateId: str(formData, "governorateId"),
    cityId: str(formData, "cityId"),
    address: str(formData, "address"),
    emergencyContactName: str(formData, "emergencyContactName"),
    emergencyContactRelation: str(formData, "emergencyContactRelation"),
    emergencyContactPhone: str(formData, "emergencyContactPhone"),
    occupation: str(formData, "occupation"),
    maritalStatus: str(formData, "maritalStatus") ?? "UNKNOWN",
    nationality: str(formData, "nationality"),
    preferredLanguage: str(formData, "preferredLanguage") ?? "ar",
    bloodGroup: str(formData, "bloodGroup") ?? "UNKNOWN",
    visitSource: str(formData, "visitSource") ?? "WALK_IN",
    referralSource: str(formData, "referralSource"),
    insurancePolicyNo: str(formData, "insurancePolicyNo"),
    allergens,
    reactions,
    severities,
  });

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const [key, issue] of Object.entries(parsed.error.flatten().fieldErrors)) {
      errors[key] = issue ?? [];
    }
    return failure("common.error", errors);
  }

  const data = parsed.data;
  const branchId = user.branchId ?? "MAIN";

  const mrn = await nextNumber("patient", branchId);
  const age = data.dateOfBirth ? computeAge(data.dateOfBirth) : null;

  try {
    const patient = await prisma.patient.create({
      data: {
        mrn,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        gender: data.gender ?? "MALE",
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        age,
        nationalId: data.nationalId,
        passportNo: data.passportNo,
        phone: data.phone,
        secondaryPhone: data.secondaryPhone,
        whatsapp: data.whatsapp,
        email: data.email,
        governorateId: data.governorateId,
        cityId: data.cityId,
        address: data.address,
        emergencyContactName: data.emergencyContactName,
        emergencyContactRelation: data.emergencyContactRelation,
        emergencyContactPhone: data.emergencyContactPhone,
        occupation: data.occupation,
        maritalStatus: data.maritalStatus,
        nationality: data.nationality,
        preferredLanguage: data.preferredLanguage,
        bloodGroup: data.bloodGroup,
        visitSource: data.visitSource,
        referralSource: data.referralSource,
        insurancePolicyNo: data.insurancePolicyNo,
        branchId,
        createdById: user.id,
        allergies: {
          create:
            allergens.length > 0
              ? allergens.map((allergen, i) => ({
                  allergen,
                  reaction: reactions[i],
                  severity: severities[i] ?? "MODERATE",
                  recordedById: user.id,
                }))
              : undefined,
        },
      },
      select: { id: true, mrn: true },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "patients",
      recordId: patient.id,
      description: `${data.nameAr || data.nameEn} · ${mrn}`,
    });

    return success(undefined, { id: patient.id, mrn });
  } catch (err) {
    console.error("createPatientAction failed", err);
    return failure("common.error");
  }
}

export async function updatePatientAction(
  id: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("patients", "update");
  const parsed = patientSchema.safeParse({
    nameAr: str(formData, "nameAr"),
    nameEn: str(formData, "nameEn"),
    gender: str(formData, "gender"),
    dateOfBirth: str(formData, "dateOfBirth"),
    nationalId: str(formData, "nationalId"),
    passportNo: str(formData, "passportNo"),
    phone: str(formData, "phone"),
    secondaryPhone: str(formData, "secondaryPhone"),
    whatsapp: str(formData, "whatsapp"),
    email: str(formData, "email"),
    governorateId: str(formData, "governorateId"),
    cityId: str(formData, "cityId"),
    address: str(formData, "address"),
    emergencyContactName: str(formData, "emergencyContactName"),
    emergencyContactRelation: str(formData, "emergencyContactRelation"),
    emergencyContactPhone: str(formData, "emergencyContactPhone"),
    occupation: str(formData, "occupation"),
    maritalStatus: str(formData, "maritalStatus") ?? "UNKNOWN",
    nationality: str(formData, "nationality"),
    preferredLanguage: str(formData, "preferredLanguage") ?? "ar",
    bloodGroup: str(formData, "bloodGroup") ?? "UNKNOWN",
    visitSource: str(formData, "visitSource") ?? "WALK_IN",
    referralSource: str(formData, "referralSource"),
    insurancePolicyNo: str(formData, "insurancePolicyNo"),
    allergens: arr(formData, "allergens"),
    reactions: arr(formData, "reactions"),
    severities: arr(formData, "severities"),
  });
  if (!parsed.success) return failure("common.error");

  const data = parsed.data;
  const age = data.dateOfBirth ? computeAge(data.dateOfBirth) : null;

  await prisma.$transaction(async (tx) => {
    await tx.allergy.deleteMany({ where: { patientId: id } });
    await tx.patient.update({
      where: { id },
      data: {
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        gender: data.gender ?? "MALE",
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        age,
        nationalId: data.nationalId,
        passportNo: data.passportNo,
        phone: data.phone,
        secondaryPhone: data.secondaryPhone,
        whatsapp: data.whatsapp,
        email: data.email,
        governorateId: data.governorateId,
        cityId: data.cityId,
        address: data.address,
        emergencyContactName: data.emergencyContactName,
        emergencyContactRelation: data.emergencyContactRelation,
        emergencyContactPhone: data.emergencyContactPhone,
        occupation: data.occupation,
        maritalStatus: data.maritalStatus,
        nationality: data.nationality,
        preferredLanguage: data.preferredLanguage,
        bloodGroup: data.bloodGroup,
        visitSource: data.visitSource,
        referralSource: data.referralSource,
        insurancePolicyNo: data.insurancePolicyNo,
        allergies: {
          create: data.allergens.map((allergen, i) => ({
            allergen,
            reaction: data.reactions[i],
            severity: data.severities[i] ?? "MODERATE",
            recordedById: user.id,
          })),
        },
      },
    });
  });

  await audit({
    userId: user.id,
    action: "update",
    module: "patients",
    recordId: id,
    description: data.nameAr || data.nameEn,
  });

  return success("common.updated");
}
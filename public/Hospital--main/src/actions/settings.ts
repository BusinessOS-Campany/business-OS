"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { setSettingValue } from "@/lib/services/hospital";
import { success, failure, type ActionResult } from "@/lib/result";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

const SETTING_KEYS = [
  "hospital_name_ar",
  "hospital_name_en",
  "hospital_phone",
  "hospital_email",
  "hospital_address",
  "hospital_governorate",
  "hospital_logo",
  "hospital_note",
  "default_currency",
  "invoice_footer",
] as const;

export async function updateHospitalSettingsAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await requirePermission("settings", "edit");
  try {
    await Promise.all(
      SETTING_KEYS.map((key) => {
        const value = str(formData, key) ?? "";
        return setSettingValue(key, value, "GENERAL", "string");
      })
    );
    await audit({ userId: actor.id, action: "update", module: "settings", description: "hospital profile updated" });
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return success("settings.saved");
  } catch (err) {
    console.error("updateHospitalSettingsAction failed", err);
    return failure("common.error");
  }
}

export async function createDepartmentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await requirePermission("settings", "create");
  const parsed = z
    .object({
      code: z.string().min(1),
      nameAr: z.string().min(1),
      nameEn: z.string().min(1),
      type: z.string().min(1),
      branchId: z.string().min(1),
      description: z.string().optional(),
    })
    .safeParse({
      code: str(formData, "code"),
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      type: str(formData, "type"),
      branchId: str(formData, "branchId"),
      description: str(formData, "description"),
    });
  if (!parsed.success) return failure("errors.formError");

  try {
    const dept = await prisma.department.create({
      data: {
        code: parsed.data.code,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        type: parsed.data.type,
        branchId: parsed.data.branchId,
        description: parsed.data.description ?? null,
      },
    });
    await audit({ userId: actor.id, action: "create", module: "settings", recordId: dept.id, description: dept.nameEn });
    revalidatePath("/settings");
    return success("common.created");
  } catch (err) {
    console.error("createDepartmentAction failed", err);
    return failure("common.error");
  }
}

export async function createBranchAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await requirePermission("settings", "create");
  const parsed = z
    .object({
      code: z.string().min(1),
      nameAr: z.string().min(1),
      nameEn: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
    })
    .safeParse({
      code: str(formData, "code"),
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address: str(formData, "address"),
    });
  if (!parsed.success) return failure("errors.formError");

  try {
    const existing = await prisma.branch.findUnique({ where: { code: parsed.data.code } });
    if (existing) return failure("common.error");

    const branch = await prisma.branch.create({
      data: {
        code: parsed.data.code,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        address: parsed.data.address ?? null,
      },
    });
    await audit({ userId: actor.id, action: "create", module: "settings", recordId: branch.id, description: branch.nameEn });
    revalidatePath("/settings");
    return success("common.created");
  } catch (err) {
    console.error("createBranchAction failed", err);
    return failure("common.error");
  }
}

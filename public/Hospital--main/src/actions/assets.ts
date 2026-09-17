"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";
import { nextNumber } from "@/lib/services/numbering";
import type { AssetStatus } from "@prisma/client";

const ASSET_STATUSES = ["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE", "RETIRED", "LOST"] as const;
const CATEGORIES = ["MEDICAL_EQUIPMENT", "COMPUTER", "FURNITURE", "VEHICLE", "MACHINE"] as const;

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export async function createAssetAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("assets");

  const parsed = z
    .object({
      nameAr: z.string().min(1),
      nameEn: z.string().optional(),
      category: z.enum(CATEGORIES).default("MEDICAL_EQUIPMENT"),
      location: z.string().optional(),
      departmentId: z.string().optional(),
      custodianId: z.string().optional(),
      serialNo: z.string().optional(),
      purchaseDate: z.string().optional(),
      warrantyUntil: z.string().optional(),
      cost: z.coerce.number().optional(),
      status: z.enum(ASSET_STATUSES).default("ACTIVE"),
      note: z.string().optional(),
    })
    .safeParse({
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      category: str(formData, "category") ?? "MEDICAL_EQUIPMENT",
      location: str(formData, "location"),
      departmentId: str(formData, "departmentId"),
      custodianId: str(formData, "custodianId"),
      serialNo: str(formData, "serialNo"),
      purchaseDate: str(formData, "purchaseDate"),
      warrantyUntil: str(formData, "warrantyUntil"),
      cost: str(formData, "cost"),
      status: str(formData, "status") ?? "ACTIVE",
      note: str(formData, "note"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const assetNo = await nextNumber("asset");
    const asset = await prisma.asset.create({
      data: {
        assetNo,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn ?? "",
        category: parsed.data.category,
        location: parsed.data.location,
        departmentId: parsed.data.departmentId,
        custodianId: parsed.data.custodianId,
        serialNo: parsed.data.serialNo,
        purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null,
        warrantyUntil: parsed.data.warrantyUntil ? new Date(parsed.data.warrantyUntil) : null,
        cost: parsed.data.cost !== undefined ? String(parsed.data.cost) : null,
        status: parsed.data.status,
        note: parsed.data.note,
      },
    });

    await audit({ userId: user.id, action: "create", module: "assets", recordId: asset.id, description: assetNo });
    return success("common.saved", { id: asset.id });
  } catch (err) {
    console.error("createAssetAction failed", err);
    return failure("common.error");
  }
}

const TRANSITIONS: Record<string, string[]> = {
  ACTIVE: ["INACTIVE", "UNDER_MAINTENANCE", "RETIRED", "LOST"],
  INACTIVE: ["ACTIVE", "UNDER_MAINTENANCE", "RETIRED", "LOST"],
  UNDER_MAINTENANCE: ["ACTIVE", "INACTIVE", "RETIRED", "LOST"],
  RETIRED: ["ACTIVE", "INACTIVE"],
  LOST: ["ACTIVE", "INACTIVE"],
};

export async function updateAssetStatusAction(
  assetId: string,
  newStatus: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("assets");

  try {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return failure("common.notFound");
    if (!ASSET_STATUSES.includes(newStatus as AssetStatus)) return failure("assets.invalidTransition");
    if (!TRANSITIONS[newStatus]?.includes(asset.status)) return failure("assets.invalidTransition");

    await prisma.asset.update({ where: { id: assetId }, data: { status: newStatus as AssetStatus } });
    await audit({
      userId: user.id,
      action: "update",
      module: "assets",
      recordId: assetId,
      description: `${asset.assetNo} → ${newStatus}`,
    });
    return success("common.updated");
  } catch (err) {
    console.error("updateAssetStatusAction failed", err);
    return failure("common.error");
  }
}
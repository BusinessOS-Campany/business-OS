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

const TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
};

export async function createMaintenanceRequestAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("maintenance");

  const parsed = z
    .object({
      assetId: z.string().min(1),
      type: z.enum(["PREVENTIVE", "CORRECTIVE"]).default("CORRECTIVE"),
      description: z.string().min(1),
      technicianId: z.string().optional(),
      scheduledAt: z.string().optional(),
    })
    .safeParse({
      assetId: str(formData, "assetId"),
      type: str(formData, "type") ?? "CORRECTIVE",
      description: str(formData, "description"),
      technicianId: str(formData, "technicianId"),
      scheduledAt: str(formData, "scheduledAt"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } });
    if (!asset) return failure("common.notFound");

    const requestNo = await nextNumber("maintenance");
    const request = await prisma.maintenanceRequest.create({
      data: {
        requestNo,
        assetId: parsed.data.assetId,
        type: parsed.data.type as "PREVENTIVE" | "CORRECTIVE",
        description: parsed.data.description,
        technicianId: parsed.data.technicianId,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      },
    });

    await audit({ userId: user.id, action: "create", module: "maintenance", recordId: request.id, description: requestNo });
    return success("common.saved", { id: request.id });
  } catch (err) {
    console.error("createMaintenanceRequestAction failed", err);
    return failure("common.error");
  }
}

export async function updateMaintenanceStatusAction(
  requestId: string,
  newStatus: string,
  options: { cost?: string; spareParts?: string; note?: string } = {}
): Promise<ActionResult> {
  const user = await requirePermission("maintenance");

  try {
    const request = await prisma.maintenanceRequest.findUnique({ where: { id: requestId } });
    if (!request) return failure("common.notFound");
    if (!TRANSITIONS[newStatus]?.includes(request.status)) return failure("maintenance.invalidTransition");

    const data: Record<string, unknown> = { status: newStatus };
    if (newStatus === "COMPLETED") {
      data.completedAt = new Date();
      if (options.cost !== undefined && options.cost !== "") data.cost = options.cost;
      if (options.spareParts !== undefined && options.spareParts !== "") data.spareParts = options.spareParts;
      if (options.note !== undefined && options.note !== "") data.note = options.note;
    }

    await prisma.maintenanceRequest.update({ where: { id: requestId }, data });
    await audit({
      userId: user.id,
      action: newStatus === "CANCELLED" ? "delete" : "update",
      module: "maintenance",
      recordId: requestId,
      description: `${request.requestNo} → ${newStatus}`,
    });
    return success("common.updated");
  } catch (err) {
    console.error("updateMaintenanceStatusAction failed", err);
    return failure("common.error");
  }
}
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";
import type { LabOrderStatus } from "@prisma/client";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function flag(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === "on" || v === "1" || v === "true";
}

const TRANSITIONS: Record<string, string[]> = {
  COLLECTED: ["ORDERED"],
  RECEIVED: ["COLLECTED"],
  PROCESSING: ["RECEIVED"],
  COMPLETED: ["PROCESSING"],
  REVIEWED: ["COMPLETED"],
  CANCELLED: ["ORDERED", "COLLECTED", "RECEIVED", "PROCESSING"],
};

export async function updateLabOrderStatusAction(
  orderId: string,
  newStatus: string,
  _prev: ActionResult | null
): Promise<ActionResult> {
  const user = await requirePermission("laboratory");

  try {
    const order = await prisma.labOrder.findUnique({
      where: { id: orderId },
      include: { items: { include: { results: true } } },
    });
    if (!order) return failure("common.notFound");
    if (!TRANSITIONS[newStatus]?.includes(order.status)) return failure("laboratory.invalidTransition");

    if (newStatus === "COMPLETED") {
      const missing = order.items.some((i) => i.results.length === 0);
      if (missing) return failure("laboratory.enterResultsFirst");
    }

    const status = newStatus as LabOrderStatus;
    const data: Record<string, unknown> = { status };
    if (newStatus === "COLLECTED") data.collectedAt = new Date();
    if (newStatus === "COMPLETED") data.completedAt = new Date();
    if (newStatus === "REVIEWED") {
      data.reviewedAt = new Date();
      data.reviewedById = user.employeeId ?? user.id;
    }

    await prisma.$transaction([
      prisma.labOrder.update({ where: { id: orderId }, data }),
      ...order.items.map((item) =>
        prisma.labOrderItem.update({ where: { id: item.id }, data: { status } })
      ),
    ]);

    await audit({
      userId: user.id,
      action: newStatus === "CANCELLED" ? "delete" : "update",
      module: "laboratory",
      recordId: orderId,
      description: `${order.orderNo} → ${newStatus}`,
    });
    return success("common.updated");
  } catch (err) {
    console.error("updateLabOrderStatusAction failed", err);
    return failure("common.error");
  }
}

export async function saveLabResultAction(
  orderItemId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("laboratory");

  const parsed = z
    .object({
      value: z.string().min(1, { message: "laboratory.resultRequired" }),
      unit: z.string().optional(),
      refLow: z.string().optional(),
      refHigh: z.string().optional(),
      note: z.string().optional(),
      isAbnormal: z.boolean().optional(),
      isCritical: z.boolean().optional(),
    })
    .safeParse({
      value: str(formData, "value"),
      unit: str(formData, "unit"),
      refLow: str(formData, "refLow"),
      refHigh: str(formData, "refHigh"),
      note: str(formData, "note"),
      isAbnormal: flag(formData, "isAbnormal"),
      isCritical: flag(formData, "isCritical"),
    });

  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "common.error");

  try {
    const item = await prisma.labOrderItem.findUnique({
      where: { id: orderItemId },
      include: { labOrder: { select: { orderNo: true } } },
    });
    if (!item) return failure("common.notFound");
    if (["COMPLETED", "REVIEWED", "CANCELLED"].includes(item.status)) return failure("laboratory.resultLocked");

    const first = await prisma.labResult.findFirst({ where: { labOrderItemId: orderItemId }, orderBy: { createdAt: "asc" } });

    const resultData = {
      value: parsed.data.value,
      unit: parsed.data.unit,
      refLow: parsed.data.refLow,
      refHigh: parsed.data.refHigh,
      note: parsed.data.note,
      isAbnormal: parsed.data.isAbnormal,
      isCritical: parsed.data.isCritical,
      performedById: user.employeeId ?? user.id,
    };

    if (first) {
      await prisma.labResult.update({ where: { id: first.id }, data: resultData });
    } else {
      await prisma.labResult.create({ data: { labOrderItemId: orderItemId, ...resultData } });
    }

    if (item.status !== "COMPLETED") {
      await prisma.labOrderItem.update({ where: { id: orderItemId }, data: { status: "COMPLETED" } });
    }

    await audit({
      userId: user.id,
      action: "update",
      module: "laboratory",
      recordId: orderItemId,
      description: `${item.labOrder.orderNo} result saved`,
    });
    return success("laboratory.savedResults");
  } catch (err) {
    console.error("saveLabResultAction failed", err);
    return failure("common.error");
  }
}

export async function createLabTestAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("laboratory", "create");

  const parsed = z
    .object({
      nameAr: z.string().min(1),
      nameEn: z.string().min(1),
      category: z.string().min(1),
      sampleType: z.string().min(1),
      unit: z.string().optional(),
      price: z.coerce.number().min(0).default(0),
    })
    .safeParse({
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      category: str(formData, "category") ?? "GENERAL",
      sampleType: str(formData, "sampleType") ?? "BLOOD",
      unit: str(formData, "unit"),
      price: Number(formData.get("price") ?? 0),
    });

  if (!parsed.success) return failure("common.error");
  if (!["BLOOD", "URINE", "STOOL", "SPUTUM", "SWAB", "TISSUE", "CSF", "OTHER"].includes(parsed.data.sampleType)) {
    return failure("common.error");
  }

  try {
    const code = `LABT-${Date.now().toString(36).toUpperCase()}`;
    const test = await prisma.labTest.create({
      data: {
        code,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        category: parsed.data.category,
        sampleType: parsed.data.sampleType as never,
        unit: parsed.data.unit,
        price: parsed.data.price,
      },
    });

    await audit({ userId: user.id, action: "create", module: "laboratory", recordId: test.id, description: test.code });
    return success("common.saved", { id: test.id });
  } catch (err) {
    console.error("createLabTestAction failed", err);
    return failure("common.error");
  }
}

export async function toggleLabTestAction(
  testId: string,
  _prev: ActionResult | null,
  _formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("laboratory");

  try {
    const test = await prisma.labTest.findUnique({ where: { id: testId } });
    if (!test) return failure("common.notFound");
    await prisma.labTest.update({ where: { id: testId }, data: { isActive: !test.isActive } });
    await audit({ userId: user.id, action: "update", module: "laboratory", recordId: testId, description: `toggle ${test.code}` });
    return success("common.updated");
  } catch (err) {
    console.error("toggleLabTestAction failed", err);
    return failure("common.error");
  }
}
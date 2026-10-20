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

const TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["ORDERED"],
  PERFORMED: ["SCHEDULED"],
  REVIEWED: ["REPORTED", "PERFORMED"],
  CANCELLED: ["ORDERED", "SCHEDULED", "PERFORMED"],
};

export async function updateRadOrderStatusAction(
  orderId: string,
  newStatus: string,
  _prev: ActionResult | null
): Promise<ActionResult> {
  const user = await requirePermission("radiology");

  try {
    const order = await prisma.radiologyOrder.findUnique({
      where: { id: orderId },
      include: { report: true },
    });
    if (!order) return failure("common.notFound");
    if (!TRANSITIONS[newStatus]?.includes(order.status)) return failure("radiology.invalidTransition");
    if (newStatus === "REVIEWED" && !order.report) return failure("radiology.reportFirst");

    const data: Record<string, unknown> = { status: newStatus };
    if (newStatus === "SCHEDULED") data.scheduledAt = new Date();
    if (newStatus === "PERFORMED") data.performedAt = new Date();
    if (newStatus === "REVIEWED") {
      data.reviewedById = user.employeeId ?? user.id;
      await prisma.radReport.update({
        where: { radiologyOrderId: orderId },
        data: { reviewedById: user.employeeId ?? user.id, reviewedAt: new Date() },
      });
    }

    await prisma.radiologyOrder.update({ where: { id: orderId }, data });

    await audit({
      userId: user.id,
      action: newStatus === "CANCELLED" ? "delete" : "update",
      module: "radiology",
      recordId: orderId,
      description: `${order.orderNo} → ${newStatus}`,
    });
    return success("common.updated");
  } catch (err) {
    console.error("updateRadOrderStatusAction failed", err);
    return failure("common.error");
  }
}

export async function saveRadReportAction(
  orderId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("radiology");

  const parsed = z
    .object({
      findings: z.string().min(1, { message: "radiology.findingsRequired" }),
      impression: z.string().min(1, { message: "radiology.impressionRequired" }),
      attachments: z.string().optional(),
    })
    .safeParse({
      findings: str(formData, "findings"),
      impression: str(formData, "impression"),
      attachments: str(formData, "attachments"),
    });

  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "common.error");

  try {
    const order = await prisma.radiologyOrder.findUnique({ where: { id: orderId } });
    if (!order) return failure("common.notFound");
    if (order.status === "CANCELLED" || order.status === "REVIEWED") return failure("radiology.reportLocked");

    const report = await prisma.radReport.findUnique({ where: { radiologyOrderId: orderId } });
    const reportData = {
      findings: parsed.data.findings,
      impression: parsed.data.impression,
      attachments: parsed.data.attachments,
      reportedById: user.employeeId ?? user.id,
      reportedAt: new Date(),
    };

    if (report) {
      await prisma.radReport.update({ where: { radiologyOrderId: orderId }, data: reportData });
    } else {
      await prisma.radReport.create({ data: { radiologyOrderId: orderId, ...reportData } });
    }

    if (order.status !== "REPORTED") {
      await prisma.radiologyOrder.update({ where: { id: orderId }, data: { status: "REPORTED", performedAt: order.performedAt ?? new Date() } });
    }

    await audit({ userId: user.id, action: "update", module: "radiology", recordId: orderId, description: `${order.orderNo} reported` });
    return success("radiology.savedReport");
  } catch (err) {
    console.error("saveRadReportAction failed", err);
    return failure("common.error");
  }
}
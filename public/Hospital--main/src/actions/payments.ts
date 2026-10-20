"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { nextNumber } from "@/lib/services/numbering";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";
import type { PaymentStatus } from "@prisma/client";

const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"];

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export async function createRefundAction(
  paymentId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("refunds", "create");

  const parsed = z
    .object({
      amount: z.coerce.number().positive(),
      reason: z.string().optional(),
    })
    .safeParse({
      amount: str(formData, "amount"),
      reason: str(formData, "reason"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, paymentNo: true, amount: true, status: true, invoiceId: true },
    });
    if (!payment) return failure("common.notFound");
    if (!payment.invoiceId) return failure("common.error");
    if (payment.status === "REFUNDED" || payment.status === "CANCELLED" || payment.status === "FAILED") {
      return failure("common.error");
    }

    const maxAmount = payment.amount.toNumber();
    const amount = Math.min(parsed.data.amount, maxAmount);
    if (amount <= 0) return failure("common.error");

    const fullRefund = amount >= maxAmount;
    const refundNo = await nextNumber("refund");

    await prisma.$transaction(async (tx) => {
      await tx.refund.create({
        data: {
          refundNo,
          invoiceId: payment.invoiceId as string,
          paymentId: payment.id,
          amount,
          reason: parsed.data.reason,
          cashierId: user.employeeId ?? undefined,
          status: "COMPLETED",
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: fullRefund ? "REFUNDED" : "COMPLETED" },
      });
    });

    await audit({
      userId: user.id,
      action: "refund",
      module: "refunds",
      recordId: payment.id,
      description: `${refundNo} · ${amount} YER`,
    });

    return success("common.saved");
  } catch (err) {
    console.error("createRefundAction failed", err);
    return failure("common.error");
  }
}

export async function updatePaymentStatusAction(
  paymentId: string,
  newStatus: string
): Promise<ActionResult> {
  const user = await requirePermission("payments", "edit");
  const status = PAYMENT_STATUSES.includes(newStatus as PaymentStatus)
    ? (newStatus as PaymentStatus)
    : null;
  if (!status) return failure("common.error");

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, paymentNo: true, status: true },
    });
    if (!payment) return failure("common.notFound");
    if (payment.status === status) return success("common.updated");

    await prisma.payment.update({ where: { id: paymentId }, data: { status } });
    await audit({
      userId: user.id,
      action: "update",
      module: "payments",
      recordId: paymentId,
      description: `${payment.paymentNo} → ${status}`,
    });
    return success("common.updated");
  } catch (err) {
    console.error("updatePaymentStatusAction failed", err);
    return failure("common.error");
  }
}
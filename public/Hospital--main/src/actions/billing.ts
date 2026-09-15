"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { nextNumber } from "@/lib/services/numbering";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";

const METHODS = ["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "MOBILE_PAYMENT", "INSURANCE", "OTHER"] as const;
const ITEM_TYPES = [
  "CONSULTATION", "PROCEDURE", "LABORATORY", "RADIOLOGY", "PHARMACY",
  "ROOM", "SURGERY", "ICU", "AMBULANCE", "SERVICE", "OTHER",
] as const;

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
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

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function createInvoiceAction(
  _prev: ActionResult<{ id: string; invoiceNo: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string; invoiceNo: string }>> {
  const user = await requirePermission("billing", "create");

  const parsed = z
    .object({
      patientId: z.string().min(1),
      discountType: z.enum(["percentage", "fixed"]).optional(),
      discountValue: z.coerce.number().min(0).optional(),
      taxRate: z.coerce.number().min(0).max(100).optional(),
      note: z.string().optional(),
    })
    .safeParse({
      patientId: str(formData, "patientId"),
      discountType: str(formData, "discountType"),
      discountValue: str(formData, "discountValue") ?? "0",
      taxRate: str(formData, "taxRate") ?? "0",
      note: str(formData, "note"),
    });

  if (!parsed.success) return failure("common.error");

  const rawItems = jsonArray(formData, "items").slice(0, 100)
    .filter((it) => typeof it.description === "string" && String(it.description).trim() !== "")
    .map((it) => ({
      type: ((ITEM_TYPES as readonly string[]).includes(String(it.type ?? "SERVICE")) ? String(it.type) : "SERVICE") as (typeof ITEM_TYPES)[number],
      serviceId: typeof it.serviceId === "string" && it.serviceId !== "" ? it.serviceId : null,
      description: String(it.description).trim(),
      quantity: Math.max(1, Math.min(9999, Number(it.quantity) || 1)),
      unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      discount: Math.max(0, Number(it.discount) || 0),
    }));

  if (rawItems.length === 0) return failure("common.error");

  const patient = await prisma.patient.findUnique({ where: { id: parsed.data.patientId, deletedAt: null }, select: { id: true } });
  if (!patient) return failure("common.notFound");

  const subtotal = round2(rawItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0));
  const itemDiscount = round2(rawItems.reduce((s, it) => s + it.discount, 0));
  const base = rawItems.length === 1
    ? round2(rawItems[0].quantity * rawItems[0].unitPrice - itemDiscount)
    : subtotal;

  let discountAmount = 0;
  if (parsed.data.discountType === "percentage") {
    discountAmount = round2((base * (parsed.data.discountValue ?? 0)) / 100);
  } else if (parsed.data.discountType === "fixed") {
    discountAmount = Math.min(base, parsed.data.discountValue ?? 0);
  }
  const discountTotal = round2(itemDiscount + discountAmount);
  const taxAmount = round2(((base - discountAmount) * (parsed.data.taxRate ?? 0)) / 100);
  const total = round2(base - discountAmount + taxAmount);

  const invoiceNo = await nextNumber("invoice");

  try {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        patientId: parsed.data.patientId,
        status: "ISSUED",
        subtotal: base,
        discountType: parsed.data.discountType,
        discountValue: parsed.data.discountValue,
        discountAmount: discountTotal,
        taxRate: parsed.data.taxRate ?? undefined,
        taxAmount,
        total,
        paidAmount: 0,
        dueAmount: total,
        currency: "YER",
        cashierId: user.employeeId ?? undefined,
        note: parsed.data.note,
        items: {
          create: rawItems.map((it) => ({
            type: it.type,
            serviceId: it.serviceId,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount,
            total: round2(it.quantity * it.unitPrice - it.discount),
          })),
        },
      },
      select: { id: true, invoiceNo: true },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "billing",
      recordId: invoice.id,
      description: `${invoice.invoiceNo} · ${parsed.data.patientId} · ${total} YER`,
    });

    return success(undefined, { id: invoice.id, invoiceNo });
  } catch (err) {
    console.error("createInvoiceAction failed", err);
    return failure("common.error");
  }
}

export async function recordPaymentAction(
  invoiceId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("payments", "create");

  const parsed = z
    .object({
      amount: z.coerce.number().positive(),
      method: z.enum(METHODS).default("CASH"),
      reference: z.string().optional(),
      note: z.string().optional(),
    })
    .safeParse({
      amount: str(formData, "amount"),
      method: str(formData, "method") ?? "CASH",
      reference: str(formData, "reference"),
      note: str(formData, "note"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, dueAmount: true, paidAmount: true, total: true, status: true },
    });
    if (!invoice) return failure("common.notFound");
    if (invoice.status === "PAID" || invoice.status === "VOID" || invoice.status === "REFUNDED") {
      return failure("billing.cannotPay");
    }

    const amount = Math.min(parsed.data.amount, invoice.dueAmount.toNumber());
    if (amount <= 0) return failure("billing.overpaid");

    const paymentNo = await nextNumber("payment");
    const newPaid = round2(invoice.paidAmount.toNumber() + amount);
    const newDue = round2(invoice.dueAmount.toNumber() - amount);

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          paymentNo,
          invoiceId,
          patientId: undefined,
          amount,
          method: parsed.data.method,
          reference: parsed.data.reference,
          currency: "YER",
          status: "COMPLETED",
          cashierId: user.employeeId ?? undefined,
          note: parsed.data.note,
        },
      });
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaid,
          dueAmount: newDue,
          status: newDue <= 0 ? "PAID" : "PARTIALLY_PAID",
        },
      });
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "payments",
      recordId: invoiceId,
      description: `${paymentNo} · ${amount} YER`,
    });

    return success("common.saved");
  } catch (err) {
    console.error("recordPaymentAction failed", err);
    return failure("common.error");
  }
}

export async function voidInvoiceAction(
  invoiceId: string,
  _prev: ActionResult | null
): Promise<ActionResult> {
  const user = await requirePermission("billing", "delete");

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true, paidAmount: true },
    });
    if (!invoice) return failure("common.notFound");
    if (invoice.status !== "ISSUED" && invoice.status !== "DRAFT") {
      return failure("billing.cannotVoid");
    }

    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "VOID" } });
    await audit({ userId: user.id, action: "void", module: "billing", recordId: invoiceId, description: "invoice voided" });
    return success("common.updated");
  } catch (err) {
    console.error("voidInvoiceAction failed", err);
    return failure("common.error");
  }
}
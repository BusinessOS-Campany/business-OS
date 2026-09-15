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

function num(formData: FormData, key: string): number | undefined {
  const v = str(formData, key);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ------------------------------------------------ Companies & Schemes

export async function saveCompanyAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("insurance", "create");

  const parsed = z
    .object({
      id: z.string().optional(),
      code: z.string().min(1),
      nameAr: z.string().min(1),
      nameEn: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      isActive: z.boolean().optional(),
    })
    .safeParse({
      id: str(formData, "id"),
      code: str(formData, "code"),
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address: str(formData, "address"),
      isActive: formData.get("isActive") === "on",
    });

  if (!parsed.success) return failure("common.error");

  try {
    const data = {
      code: parsed.data.code,
      nameAr: parsed.data.nameAr,
      nameEn: parsed.data.nameEn ?? "",
      phone: parsed.data.phone,
      email: parsed.data.email,
      address: parsed.data.address,
      isActive: parsed.data.isActive ?? true,
    };

    if (parsed.data.id) {
      try {
        await prisma.insuranceCompany.update({ where: { id: parsed.data.id }, data });
      } catch (e: unknown) {
        if (isP2002(e)) return failure("common.error");
        throw e;
      }
      await audit({ userId: user.id, action: "update", module: "insurance", recordId: parsed.data.id, description: parsed.data.code });
    } else {
      let company;
      try {
        company = await prisma.insuranceCompany.create({ data, select: { id: true } });
      } catch (e: unknown) {
        if (isP2002(e)) return failure("common.error");
        throw e;
      }
      await audit({ userId: user.id, action: "create", module: "insurance", recordId: company.id, description: parsed.data.code });
    }
    return success("common.saved");
  } catch (err) {
    console.error("saveCompanyAction failed", err);
    return failure("common.error");
  }
}

export async function toggleCompanyAction(
  companyId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("insurance");
  try {
    const company = await prisma.insuranceCompany.findUnique({ where: { id: companyId }, select: { id: true, code: true, isActive: true } });
    if (!company) return failure("common.notFound");
    await prisma.insuranceCompany.update({ where: { id: companyId }, data: { isActive: !company.isActive } });
    await audit({ userId: user.id, action: "update", module: "insurance", recordId: companyId, description: company.code });
    return success("common.updated");
  } catch (err) {
    console.error("toggleCompanyAction failed", err);
    return failure("common.error");
  }
}

export async function saveSchemeAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("insurance", "create");

  const parsed = z
    .object({
      id: z.string().optional(),
      companyId: z.string().min(1),
      nameAr: z.string().min(1),
      nameEn: z.string().optional(),
      coverageRate: z.number().min(0).max(100),
      annualLimit: z.number().optional(),
      isActive: z.boolean().optional(),
    })
    .safeParse({
      id: str(formData, "id"),
      companyId: str(formData, "companyId"),
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      coverageRate: num(formData, "coverageRate") ?? 80,
      annualLimit: num(formData, "annualLimit"),
      isActive: formData.get("isActive") === "on",
    });

  if (!parsed.success) return failure("common.error");

  try {
    const data = {
      companyId: parsed.data.companyId,
      nameAr: parsed.data.nameAr,
      nameEn: parsed.data.nameEn ?? "",
      coverageRate: parsed.data.coverageRate,
      annualLimit: parsed.data.annualLimit,
      isActive: parsed.data.isActive ?? true,
    };

    if (parsed.data.id) {
      await prisma.insuranceScheme.update({ where: { id: parsed.data.id }, data });
      await audit({ userId: user.id, action: "update", module: "insurance", recordId: parsed.data.id, description: parsed.data.nameAr });
    } else {
      const scheme = await prisma.insuranceScheme.create({ data, select: { id: true } });
      await audit({ userId: user.id, action: "create", module: "insurance", recordId: scheme.id, description: parsed.data.nameAr });
    }
    return success("common.saved");
  } catch (err) {
    console.error("saveSchemeAction failed", err);
    return failure("common.error");
  }
}

export async function toggleSchemeAction(
  schemeId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("insurance");
  try {
    const scheme = await prisma.insuranceScheme.findUnique({ where: { id: schemeId }, select: { id: true, nameAr: true, isActive: true } });
    if (!scheme) return failure("common.notFound");
    await prisma.insuranceScheme.update({ where: { id: schemeId }, data: { isActive: !scheme.isActive } });
    await audit({ userId: user.id, action: "update", module: "insurance", recordId: schemeId, description: scheme.nameAr });
    return success("common.updated");
  } catch (err) {
    console.error("toggleSchemeAction failed", err);
    return failure("common.error");
  }
}

// ------------------------------------------------ Claims

const TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ["DRAFT"],
  IN_REVIEW: ["SUBMITTED"],
  APPROVED: ["IN_REVIEW", "SUBMITTED"],
  PARTIALLY_APPROVED: ["IN_REVIEW", "SUBMITTED"],
  REJECTED: ["IN_REVIEW", "SUBMITTED"],
  PAID: ["APPROVED", "PARTIALLY_APPROVED"],
};

export async function createClaimAction(
  invoiceId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("insurance", "create");

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNo: true,
        dueAmount: true,
        patientId: true,
        insuranceClaim: { select: { id: true } },
        patient: {
          select: {
            insuranceCompanyId: true,
            insurancePolicyNo: true,
          },
        },
      },
    });
    if (!invoice) return failure("common.notFound");
    if (invoice.insuranceClaim) return failure("common.error");
    if (!invoice.patient.insuranceCompanyId) return failure("insurance.noClaimable");

    const companyId = str(formData, "companyId") ?? invoice.patient.insuranceCompanyId;
    const policyNo = str(formData, "policyNo") ?? invoice.patient.insurancePolicyNo;
    const amount = num(formData, "amount") ?? Number(invoice.dueAmount);
    if (amount <= 0) return failure("common.error");

    const claimNo = await nextNumber("claim", user.branchId ?? "MAIN");

    const claim = await prisma.insuranceClaim.create({
      data: {
        claimNo,
        invoiceId,
        patientId: invoice.patientId,
        companyId,
        policyNo,
        amount: round2(amount),
      },
      select: { id: true },
    });

    await audit({ userId: user.id, action: "create", module: "insurance", recordId: claim.id, description: claimNo });
    return success("insurance.claimCreated", { id: claim.id });
  } catch (err) {
    console.error("createClaimAction failed", err);
    return failure("common.error");
  }
}

export async function submitClaimAction(
  claimId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("insurance");
  try {
    const claim = await prisma.insuranceClaim.findUnique({ where: { id: claimId }, select: { status: true, claimNo: true } });
    if (!claim) return failure("common.notFound");
    if (!TRANSITIONS.SUBMITTED.includes(claim.status)) return failure("common.error");

    await prisma.insuranceClaim.update({
      where: { id: claimId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
    await audit({ userId: user.id, action: "update", module: "insurance", recordId: claimId, description: `${claim.claimNo} → SUBMITTED` });
    return success("common.updated");
  } catch (err) {
    console.error("submitClaimAction failed", err);
    return failure("common.error");
  }
}

export async function sendToReviewAction(
  claimId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("insurance");
  try {
    const claim = await prisma.insuranceClaim.findUnique({ where: { id: claimId }, select: { status: true, claimNo: true } });
    if (!claim) return failure("common.notFound");
    if (!TRANSITIONS.IN_REVIEW.includes(claim.status)) return failure("common.error");

    await prisma.insuranceClaim.update({ where: { id: claimId }, data: { status: "IN_REVIEW" } });
    await audit({ userId: user.id, action: "update", module: "insurance", recordId: claimId, description: `${claim.claimNo} → IN_REVIEW` });
    return success("common.updated");
  } catch (err) {
    console.error("sendToReviewAction failed", err);
    return failure("common.error");
  }
}

export async function decideClaimAction(
  claimId: string,
  decision: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("insurance");

  const parsed = z.enum(["APPROVED", "PARTIALLY_APPROVED", "REJECTED"]).safeParse(decision);
  if (!parsed.success) return failure("common.error");

  try {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      select: { status: true, claimNo: true, amount: true },
    });
    if (!claim) return failure("common.notFound");
    if (!TRANSITIONS[parsed.data].includes(claim.status)) return failure("common.error");

    let approvedAmount: number | undefined;
    if (parsed.data === "APPROVED") approvedAmount = Number(claim.amount);
    else if (parsed.data === "PARTIALLY_APPROVED") approvedAmount = num(formData, "approvedAmount");
    if (parsed.data === "PARTIALLY_APPROVED" && (approvedAmount === undefined || approvedAmount <= 0)) {
      return failure("common.error");
    }
    if (approvedAmount !== undefined && approvedAmount > Number(claim.amount)) approvedAmount = Number(claim.amount);

    await prisma.insuranceClaim.update({
      where: { id: claimId },
      data: {
        status: parsed.data,
        approvedAmount: parsed.data === "REJECTED" ? null : approvedAmount,
        decisionAt: new Date(),
        notes: str(formData, "notes"),
      },
    });
    await audit({ userId: user.id, action: "update", module: "insurance", recordId: claimId, description: `${claim.claimNo} → ${parsed.data}` });
    return success("common.updated");
  } catch (err) {
    console.error("decideClaimAction failed", err);
    return failure("common.error");
  }
}

export async function markClaimPaidAction(
  claimId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("insurance");

  try {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      select: {
        status: true,
        claimNo: true,
        approvedAmount: true,
        amount: true,
        invoiceId: true,
        patientId: true,
        invoice: { select: { dueAmount: true, paidAmount: true, status: true } },
      },
    });
    if (!claim) return failure("common.notFound");
    if (!TRANSITIONS.PAID.includes(claim.status)) return failure("common.error");

    const invoice = claim.invoice;
    if (!invoice || invoice.status === "PAID" || invoice.status === "VOID" || invoice.status === "REFUNDED") {
      return failure("common.error");
    }

    const payAmount = round2(Math.min(Number(claim.approvedAmount ?? claim.amount), Number(invoice.dueAmount)));
    if (payAmount <= 0) return failure("common.error");

    const paymentNo = await nextNumber("payment", user.branchId ?? "MAIN");
    const newPaid = round2(Number(invoice.paidAmount) + payAmount);
    const newDue = round2(Number(invoice.dueAmount) - payAmount);

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          paymentNo,
          invoiceId: claim.invoiceId,
          patientId: claim.patientId,
          amount: payAmount,
          method: "INSURANCE",
          reference: claim.claimNo,
          currency: "YER",
          status: "COMPLETED",
          cashierId: user.employeeId ?? undefined,
          note: `Insurance claim ${claim.claimNo}`,
        },
      });
      await tx.invoice.update({
        where: { id: claim.invoiceId },
        data: {
          paidAmount: newPaid,
          dueAmount: newDue,
          status: newDue <= 0 ? "PAID" : "PARTIALLY_PAID",
        },
      });
      await tx.insuranceClaim.update({
        where: { id: claimId },
        data: { status: "PAID", decisionAt: new Date() },
      });
    });

    await audit({ userId: user.id, action: "update", module: "insurance", recordId: claimId, description: `${claim.claimNo} → PAID ${payAmount}` });
    return success("common.updated");
  } catch (err) {
    console.error("markClaimPaidAction failed", err);
    return failure("common.error");
  }
}

function isP2002(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}
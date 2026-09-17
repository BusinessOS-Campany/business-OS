"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { nextNumber } from "@/lib/services/numbering";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;
const METHODS = ["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "MOBILE_PAYMENT", "INSURANCE", "OTHER"] as const;

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

export async function createAccountAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("accounting", "create");

  const parsed = z
    .object({
      code: z.string().min(1),
      nameAr: z.string().min(1),
      nameEn: z.string().optional(),
      type: z.enum(ACCOUNT_TYPES).default("ASSET"),
      parentId: z.string().optional(),
      isActive: z.boolean().optional(),
    })
    .safeParse({
      code: str(formData, "code"),
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      type: str(formData, "type") ?? "ASSET",
      parentId: str(formData, "parentId"),
      isActive: formData.get("isActive") === "on",
    });

  if (!parsed.success) return failure("common.error");

  try {
    if (parsed.data.parentId) {
      const parent = await prisma.account.findUnique({
        where: { id: parsed.data.parentId },
        select: { id: true },
      });
      if (!parent) return failure("common.notFound");
    }

    const account = await prisma.account.create({
      data: {
        code: parsed.data.code,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn ?? "",
        type: parsed.data.type,
        parentId: parsed.data.parentId,
        isActive: parsed.data.isActive ?? true,
      },
      select: { id: true, code: true },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "accounting",
      recordId: account.id,
      description: `${account.code} · ${parsed.data.nameAr}`,
    });
    return success("common.saved");
  } catch (err) {
    console.error("createAccountAction failed", err);
    return failure("common.error");
  }
}

export async function createJournalEntryAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("accounting", "create");

  const parsed = z
    .object({
      date: z.string().min(1),
      description: z.string().optional(),
      reference: z.string().optional(),
    })
    .safeParse({
      date: str(formData, "date"),
      description: str(formData, "description"),
      reference: str(formData, "reference"),
    });

  if (!parsed.success) return failure("common.error");

  const rawLines = jsonArray(formData, "lines")
    .slice(0, 500)
    .map((l) => ({
      accountId: typeof l.accountId === "string" ? l.accountId.trim() : "",
      debit: Math.max(0, Number(l.debit) || 0),
      credit: Math.max(0, Number(l.credit) || 0),
    }))
    .filter((l) => l.accountId !== "" && (l.debit > 0 || l.credit > 0));

  if (rawLines.length === 0) return failure("common.error");

  const totalDebit = round2(rawLines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(rawLines.reduce((s, l) => s + l.credit, 0));
  if (totalDebit !== totalCredit) return failure("common.error");

  try {
    const accountIds = Array.from(new Set(rawLines.map((l) => l.accountId)));
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true },
    });
    if (accounts.length !== accountIds.length) return failure("common.notFound");

    const date = new Date(parsed.data.date);
    if (Number.isNaN(date.getTime())) return failure("common.error");

    const entryNo = await nextNumber("journal");
    const entry = await prisma.journalEntry.create({
      data: {
        entryNo,
        date,
        description: parsed.data.description,
        reference: parsed.data.reference,
        createdById: user.id,
        lines: {
          create: rawLines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            currency: "YER",
          })),
        },
      },
      select: { id: true, entryNo: true },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "accounting",
      recordId: entry.id,
      description: `${entry.entryNo} · ${date.toISOString().slice(0, 10)}`,
    });
    return success("common.saved", { id: entry.id });
  } catch (err) {
    console.error("createJournalEntryAction failed", err);
    return failure("common.error");
  }
}

export async function createExpenseCategoryAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("accounting", "create");

  const parsed = z
    .object({
      nameAr: z.string().min(1),
      nameEn: z.string().optional(),
      accountId: z.string().optional(),
    })
    .safeParse({
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      accountId: str(formData, "accountId"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const cat = await prisma.expenseCategory.create({
      data: {
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn ?? "",
        accountId: parsed.data.accountId,
      },
      select: { id: true, nameAr: true },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "accounting",
      recordId: cat.id,
      description: cat.nameAr,
    });
    return success("common.saved");
  } catch (err) {
    console.error("createExpenseCategoryAction failed", err);
    return failure("common.error");
  }
}

export async function createExpenseAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("expenses", "create");

  const parsed = z
    .object({
      categoryId: z.string().min(1),
      amount: z.coerce.number().positive(),
      method: z.enum(METHODS).default("CASH"),
      paidAt: z.string().optional(),
      paidById: z.string().optional(),
      supplierId: z.string().optional(),
      reference: z.string().optional(),
      note: z.string().optional(),
    })
    .safeParse({
      categoryId: str(formData, "categoryId"),
      amount: str(formData, "amount"),
      method: str(formData, "method") ?? "CASH",
      paidAt: str(formData, "paidAt"),
      paidById: str(formData, "paidById"),
      supplierId: str(formData, "supplierId"),
      reference: str(formData, "reference"),
      note: str(formData, "note"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const category = await prisma.expenseCategory.findUnique({
      where: { id: parsed.data.categoryId },
      select: { id: true },
    });
    if (!category) return failure("common.notFound");

    const paidAt = parsed.data.paidAt ? new Date(`${parsed.data.paidAt}T00:00:00`) : new Date();
    if (Number.isNaN(paidAt.getTime())) return failure("common.error");

    const expenseNo = await nextNumber("expense");
    const expense = await prisma.expense.create({
      data: {
        expenseNo,
        categoryId: parsed.data.categoryId,
        amount: parsed.data.amount,
        currency: "YER",
        method: parsed.data.method,
        paidAt,
        paidById: parsed.data.paidById,
        supplierId: parsed.data.supplierId,
        reference: parsed.data.reference,
        note: parsed.data.note,
      },
      select: { id: true, expenseNo: true },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "expenses",
      recordId: expense.id,
      description: `${expense.expenseNo} · ${parsed.data.amount} YER`,
    });
    return success("common.saved", { id: expense.id });
  } catch (err) {
    console.error("createExpenseAction failed", err);
    return failure("common.error");
  }
}
import { z } from "zod";
import type { PrismaClient } from "@/core/db/generated/prisma/client";
import { ApiError } from "@/core/http/api";
import { writeAuditLog } from "@/core/audit/service";

export const expenseSchema = z.object({
  categoryId: z.string().min(1).nullable().optional(),
  amount: z.number().int().positive(),
  cashAccountId: z.string().min(1).nullable().optional(),
  note: z.string().max(500).optional(),
  spentAt: z.coerce.date().optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export interface TenantRef {
  organizationId: string;
  userId?: string;
}

/** Records an expense; when funded from a cash account, moves cash out too. */
export async function createExpense(
  prisma: PrismaClient,
  tenant: TenantRef,
  input: ExpenseInput,
): Promise<{ expenseId: string }> {
  return prisma.$transaction(async (tx) => {
    if (input.categoryId) {
      const cat = await tx.expenseCategory.findFirst({
        where: { id: input.categoryId, organizationId: tenant.organizationId },
      });
      if (!cat) throw ApiError.notFound("Expense category not found");
    }

    let account: { id: string } | null = null;
    if (input.cashAccountId) {
      account = await tx.cashAccount.findFirst({
        where: { id: input.cashAccountId, organizationId: tenant.organizationId },
        select: { id: true },
      });
      if (!account) throw ApiError.notFound("Cash account not found");
    }

    const expense = await tx.expense.create({
      data: {
        organizationId: tenant.organizationId,
        categoryId: input.categoryId ?? undefined,
        amount: BigInt(input.amount),
        cashAccountId: account?.id,
        note: input.note,
        spentAt: input.spentAt ?? new Date(),
        createdByUserId: tenant.userId,
      },
      select: { id: true },
    });

    if (account) {
      await tx.cashMovement.create({
        data: {
          organizationId: tenant.organizationId,
          accountId: account.id,
          delta: -BigInt(input.amount),
          reason: "expense",
          refType: "expense",
          refId: expense.id,
          note: input.note,
          createdByUserId: tenant.userId,
        },
      });
    }

    await writeAuditLog(tx, { organizationId: tenant.organizationId }, {
      action: "expense.created",
      entityType: "expense",
      entityId: expense.id,
      after: { amount: String(input.amount) },
    });

    return { expenseId: expense.id };
  });
}

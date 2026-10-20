import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const EXPENSE_PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER", "CREDIT"] as const;

export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export function createExpenseSchema(t: Dictionary) {
  return z.object({
    type: z.string().min(1, t.addExpense.typeError),
    amount: z.coerce.number(t.addExpense.amountError).positive(t.addExpense.amountError),
    paymentMethod: z
      .string()
      .min(1, t.addExpense.paymentMethodError)
      .refine(
        (value) => (EXPENSE_PAYMENT_METHODS as readonly string[]).includes(value),
        t.addExpense.paymentMethodError,
      ),
    expenseDate: z
      .string()
      .min(1, t.addExpense.dateError)
      .refine((value) => !Number.isNaN(Date.parse(value)), t.addExpense.dateError),
    notes: z.string().max(500).optional().default(""),
  });
}

export type ExpenseInput = z.infer<ReturnType<typeof createExpenseSchema>>;

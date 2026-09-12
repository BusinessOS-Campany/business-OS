import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function createAdvanceSchema(t: Dictionary) {
  return z.object({
    employeeId: z.string().min(1, t.addAdvance.employeeError),
    employeeName: z.string().min(1, t.addAdvance.employeeError),
    amount: z.coerce.number(t.addAdvance.amountError).positive(t.addAdvance.amountError),
    advanceDate: z
      .string()
      .min(1, t.addAdvance.dateError)
      .refine((value) => !Number.isNaN(Date.parse(value)), t.addAdvance.dateError),
    notes: z.string().max(500).optional().default(""),
  });
}

export type AdvanceInput = z.infer<ReturnType<typeof createAdvanceSchema>>;

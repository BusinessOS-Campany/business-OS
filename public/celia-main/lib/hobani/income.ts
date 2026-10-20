import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const HOBANI_PERIODS = ["الفترة الصباحية", "الفترة المسائية"] as const;

export const HOBANI_CARD_TYPES = [100, 200, 300, 400, 500, 1000] as const;

export function hobaniPeriodLabel(value: string, t: Dictionary): string {
  const index = (HOBANI_PERIODS as readonly string[]).indexOf(value);
  return index >= 0 ? t.hobani.periods[index] : value;
}

export function createHobaniIncomeSchema(t: Dictionary) {
  return z.object({
    income: z.coerce.number(t.hobani.incomeInvalid).positive(t.hobani.incomeInvalid),
    period: z
      .string()
      .min(1, t.hobani.selectPeriodError)
      .refine(
        (value) => (HOBANI_PERIODS as readonly string[]).includes(value),
        t.hobani.selectPeriodError,
      ),
    cardType: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce
        .number(t.hobani.selectCardTypeError)
        .int(t.hobani.selectCardTypeError)
        .refine(
          (value) => (HOBANI_CARD_TYPES as readonly number[]).includes(value),
          t.hobani.selectCardTypeError,
        )
        .optional(),
    ),
    quantity: z.preprocess(
      (value) => (value === "" ? 0 : value),
      z.coerce.number().int().min(0).default(0),
    ),
  });
}

export type HobaniIncomeInput = z.infer<ReturnType<typeof createHobaniIncomeSchema>>;

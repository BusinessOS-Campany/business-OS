import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const BALANCE_PROVIDERS = ["YOU", "MTN", "Sabafon", "Yemen Mobile", "YemenNet"] as const;

export function createBalanceChargeSchema(t: Dictionary) {
  return z.object({
    provider: z
      .string()
      .min(1, t.balance.selectProviderError)
      .refine(
        (value) => (BALANCE_PROVIDERS as readonly string[]).includes(value),
        t.balance.selectProviderError,
      ),
    amount: z.coerce.number(t.balance.amountError).positive(t.balance.amountError),
    notes: z.string().max(500).optional().default(""),
  });
}

export type BalanceChargeInput = z.infer<ReturnType<typeof createBalanceChargeSchema>>;

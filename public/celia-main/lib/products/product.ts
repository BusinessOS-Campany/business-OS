import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function createProductSchema(t: Dictionary) {
  return z.object({
    name: z.string().min(1, t.addProductPrice.nameError).max(200, t.addProductPrice.nameError),
    category: z.string().min(1, t.addProductPrice.categoryError).max(200, t.addProductPrice.categoryError),
    price: z.coerce.number(t.addProductPrice.priceError).nonnegative(t.addProductPrice.priceError),
  });
}

export type ProductInput = z.infer<ReturnType<typeof createProductSchema>>;

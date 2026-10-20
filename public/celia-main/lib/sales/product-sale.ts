import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function createProductSaleSchema(t: Dictionary) {
  return z.object({
    productId: z
      .string()
      .min(1, t.addProduct.selectProductError)
      .uuid(t.addProduct.selectProductError),
    unitPrice: z.coerce.number(t.addProduct.priceError).positive(t.addProduct.priceError),
    total: z.coerce.number(t.addProduct.finalPriceError).positive(t.addProduct.finalPriceError),
  });
}

export type ProductSaleInput = z.infer<ReturnType<typeof createProductSaleSchema>>;

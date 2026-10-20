import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export interface ProductOption {
  id: string;
  name: string;
  category: string;
  price: number;
}

export async function getProductOptions(): Promise<ProductOption[]> {
  const rows = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      category: schema.products.category,
      price: schema.products.price,
    })
    .from(schema.products)
    .orderBy(asc(schema.products.category), asc(schema.products.name));

  return rows.map((row) => ({
    ...row,
    price: Number(row.price ?? 0),
  }));
}

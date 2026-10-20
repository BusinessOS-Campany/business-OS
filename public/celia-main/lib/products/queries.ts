import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export interface ProductSaleRow {
  id: string;
  productId: string;
  name: string;
  category: string;
  unitPrice: number;
  finalPrice: number;
  createdAt: Date;
}

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: number;
  createdAt: Date;
}

export async function getProducts(): Promise<ProductRow[]> {
  const rows = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      category: schema.products.category,
      price: schema.products.price,
      createdAt: schema.products.createdAt,
    })
    .from(schema.products)
    .orderBy(asc(schema.products.category), asc(schema.products.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price ?? 0),
    createdAt: row.createdAt,
  }));
}

export async function getAllProductSales(): Promise<ProductSaleRow[]> {
  const rows = await db
    .select({
      id: schema.productSales.id,
      productId: schema.productSales.productId,
      name: schema.products.name,
      category: schema.products.category,
      unitPrice: schema.productSales.unitPrice,
      finalPrice: schema.productSales.total,
      createdAt: schema.productSales.createdAt,
    })
    .from(schema.productSales)
    .innerJoin(schema.products, eq(schema.productSales.productId, schema.products.id))
    .orderBy(desc(schema.productSales.createdAt));

  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    name: row.name,
    category: row.category,
    unitPrice: Number(row.unitPrice ?? 0),
    finalPrice: Number(row.finalPrice ?? 0),
    createdAt: row.createdAt,
  }));
}

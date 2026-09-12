import { count, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cached } from "@/lib/cache";

export interface ProductIncomeRow {
  productId: string;
  name: string;
  income: number;
  percent: number;
}

export interface CategoryIncomeGroup {
  category: string;
  total: number;
  products: ProductIncomeRow[];
}

export interface SoldProductRow {
  productId: string;
  name: string;
  quantity: number;
  income: number;
}

export interface TotalSalesStats {
  groups: CategoryIncomeGroup[];
  copy: number;
  hobani: number;
  sales: number;
  wallet: number;
  total: number;
  copyPercent: number;
  hobaniPercent: number;
  salesPercent: number;
  walletPercent: number;
  soldProducts: SoldProductRow[];
  totalCopies: number;
}

function percent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

const TOTAL_SALES_TTL_MS = 60_000;

export function getTotalSalesStats(): Promise<TotalSalesStats> {
  return cached("sales:totals", TOTAL_SALES_TTL_MS, computeTotalSalesStats);
}

async function computeTotalSalesStats(): Promise<TotalSalesStats> {
  const [productRows, copyRows, hobaniRows, walletRows] = await Promise.all([
    db.select({
        productId: schema.products.id,
        name: schema.products.name,
        category: schema.products.category,
        income: sql<number>`coalesce(sum(${schema.productSales.total}), 0)`,
        quantity: sql<number>`coalesce(sum(${schema.productSales.quantity}), 0)`,
      })
      .from(schema.products)
      .leftJoin(schema.productSales, eq(schema.productSales.productId, schema.products.id))
      .groupBy(schema.products.id, schema.products.name, schema.products.category)
      .orderBy(desc(sql`coalesce(sum(${schema.productSales.total}), 0)`)),
    db
      .select({ total: sql<number>`coalesce(sum(${schema.copyRecords.price}), 0)`, files: count() })
      .from(schema.copyRecords),
    db
      .select({ total: sql<number>`coalesce(sum(${schema.hobaniIncome.income}), 0)` })
      .from(schema.hobaniIncome),
    db
      .select({ total: sql<number>`coalesce(sum(${schema.balanceCharge.amount}), 0)` })
      .from(schema.balanceCharge),
  ]);

  const categoryMap = new Map<string, ProductIncomeRow[]>();
  for (const row of productRows) {
    const income = Number(row.income ?? 0);
    const existing = categoryMap.get(row.category) ?? [];
    existing.push({ productId: row.productId, name: row.name, income, percent: 0 });
    categoryMap.set(row.category, existing);
  }

  const groups: CategoryIncomeGroup[] = Array.from(categoryMap.entries()).map(
    ([category, products]) => {
      const total = products.reduce((acc, product) => acc + product.income, 0);
      return {
        category,
        total,
        products: products.map((product) => ({
          ...product,
          percent: percent(product.income, total),
        })),
      };
    },
  );

  const copy = Number(copyRows[0]?.total ?? 0);
  const hobani = Number(hobaniRows[0]?.total ?? 0);
  const sales = groups.reduce((acc, group) => acc + group.total, 0);
  const wallet = Number(walletRows[0]?.total ?? 0);
  const total = copy + hobani + sales + wallet;
  const totalCopies = Number(copyRows[0]?.files ?? 0);

  const soldProducts: SoldProductRow[] = productRows
    .filter((row) => Number(row.income ?? 0) > 0)
    .map((row) => ({
      productId: row.productId,
      name: row.name,
      quantity: Number(row.quantity ?? 0),
      income: Number(row.income ?? 0),
    }));

  return {
    groups,
    copy,
    hobani,
    sales,
    wallet,
    total,
    copyPercent: percent(copy, total),
    hobaniPercent: percent(hobani, total),
    salesPercent: percent(sales, total),
    walletPercent: percent(wallet, total),
    soldProducts,
    totalCopies,
  };
}

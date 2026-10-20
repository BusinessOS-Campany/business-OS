import { count, desc, gte, sum } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cached } from "@/lib/cache";
import { HOBANI_PERIODS } from "@/lib/hobani/income";

export interface IncomeSummaryProduct {
  id: string;
  name: string;
  price: number;
  sizeGB: number;
  copiedAt: Date;
}

export interface IncomeSummaryStats {
  copy: number;
  hobani: number;
  sales: number;
  wallet: number;
  total: number;
  copyPercent: number;
  hobaniPercent: number;
  salesPercent: number;
  walletPercent: number;
  morning: number;
  evening: number;
  morningPercent: number;
  eveningPercent: number;
  totalCopies: number;
  products: IncomeSummaryProduct[];
}

function percent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

/**
 * Aggregates income categories since an optional start date (all-time when
 * `from` is omitted): copies, hobani (by shift), sales and wallet charges.
 */
const INCOME_SUMMARY_TTL_MS = 15_000;

export function getIncomeSummary(from?: Date): Promise<IncomeSummaryStats> {
  const since = from ?? new Date(0);
  const key = since.getTime() === 0 ? "all" : String(since.getTime());
  return cached(`income:summary:${key}`, INCOME_SUMMARY_TTL_MS, () => computeIncomeSummary(since));
}

async function computeIncomeSummary(from: Date): Promise<IncomeSummaryStats> {
  const since = from;

  const [copyRows, hobaniRows, walletRows, productRows, salesRows] = await Promise.all([
    db
      .select({
        total: sum(schema.copyRecords.price),
        files: count(),
      })
      .from(schema.copyRecords)
      .where(gte(schema.copyRecords.createdAt, since)),
    db
      .select({
        period: schema.hobaniIncome.period,
        total: sum(schema.hobaniIncome.income),
      })
      .from(schema.hobaniIncome)
      .where(gte(schema.hobaniIncome.createdAt, since))
      .groupBy(schema.hobaniIncome.period),
    db
      .select({
        total: sum(schema.balanceCharge.amount),
      })
      .from(schema.balanceCharge)
      .where(gte(schema.balanceCharge.createdAt, since)),
    db
      .select({
        id: schema.copyRecords.id,
        name: schema.copyRecords.name,
        price: schema.copyRecords.price,
        sizeGB: schema.copyRecords.sizeGB,
        copiedAt: schema.copyRecords.copiedAt,
      })
      .from(schema.copyRecords)
      .where(gte(schema.copyRecords.createdAt, since))
      .orderBy(desc(schema.copyRecords.copiedAt))
      .limit(8),
    db
      .select({
        total: sum(schema.productSales.total),
      })
      .from(schema.productSales)
      .where(gte(schema.productSales.createdAt, since)),
  ]);

  const copy = Number(copyRows[0]?.total ?? 0);
  const totalCopies = copyRows[0]?.files ?? 0;
  const hobani = hobaniRows.reduce((acc, row) => acc + Number(row.total ?? 0), 0);
  const sales = Number(salesRows[0]?.total ?? 0);
  const wallet = Number(walletRows[0]?.total ?? 0);
  const total = copy + hobani + sales + wallet;

  const morning = Number(
    hobaniRows.find((row) => row.period === HOBANI_PERIODS[0])?.total ?? 0,
  );
  const evening = Number(
    hobaniRows.find((row) => row.period === HOBANI_PERIODS[1])?.total ?? 0,
  );

  return {
    copy,
    hobani,
    sales,
    wallet,
    total,
    copyPercent: percent(copy, total),
    hobaniPercent: percent(hobani, total),
    salesPercent: percent(sales, total),
    walletPercent: percent(wallet, total),
    morning,
    evening,
    morningPercent: percent(morning, total),
    eveningPercent: percent(evening, total),
    totalCopies,
    products: productRows.map((row) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price ?? 0),
      sizeGB: Number(row.sizeGB ?? 0),
      copiedAt: row.copiedAt,
    })),
  };
}

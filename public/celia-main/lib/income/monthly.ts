import { count, sql, sum } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cached } from "@/lib/cache";
import { AR_MONTHS } from "@/lib/i18n/dictionaries";

export interface MonthlyIncomeRow {
  monthKey: string;
  month: string;
  copy: number;
  hobani: number;
  sales: number;
  wallet: number;
  total: number;
  totalCopies: number;
}

export interface MonthlyIncomeStats {
  rows: MonthlyIncomeRow[];
  copy: number;
  hobani: number;
  sales: number;
  wallet: number;
  total: number;
  copyPercent: number;
  hobaniPercent: number;
  salesPercent: number;
  walletPercent: number;
  totalCopies: number;
}

function percent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const index = Math.min(Math.max(month - 1, 0), AR_MONTHS.length - 1);
  return `${AR_MONTHS[index]} ${year}`;
}

const MONTHLY_INCOME_TTL_MS = 60_000;

export function getMonthlyIncomeStats(): Promise<MonthlyIncomeStats> {
  return cached("income:monthly", MONTHLY_INCOME_TTL_MS, computeMonthlyIncomeStats);
}

async function computeMonthlyIncomeStats(): Promise<MonthlyIncomeStats> {
  const [copyRows, hobaniRows, walletRows] = await Promise.all([
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${schema.copyRecords.createdAt}), 'YYYY-MM')`,
        total: sum(schema.copyRecords.price),
        files: count(),
      })
      .from(schema.copyRecords)
      .groupBy(sql`date_trunc('month', ${schema.copyRecords.createdAt})`),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${schema.hobaniIncome.createdAt}), 'YYYY-MM')`,
        total: sum(schema.hobaniIncome.income),
      })
      .from(schema.hobaniIncome)
      .groupBy(sql`date_trunc('month', ${schema.hobaniIncome.createdAt})`),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${schema.balanceCharge.createdAt}), 'YYYY-MM')`,
        total: sum(schema.balanceCharge.amount),
      })
      .from(schema.balanceCharge)
      .groupBy(sql`date_trunc('month', ${schema.balanceCharge.createdAt})`),
  ]);

  const copyMap = new Map(copyRows.map((row) => [row.month, row]));
  const hobaniMap = new Map(hobaniRows.map((row) => [row.month, row]));
  const walletMap = new Map(walletRows.map((row) => [row.month, row]));

  const monthKeys = Array.from(
    new Set([...copyMap.keys(), ...hobaniMap.keys(), ...walletMap.keys()]),
  ).sort().reverse();

  const rows: MonthlyIncomeRow[] = monthKeys.map((monthKey) => {
    const copy = Number(copyMap.get(monthKey)?.total ?? 0);
    const hobani = Number(hobaniMap.get(monthKey)?.total ?? 0);
    const sales = 0;
    const wallet = Number(walletMap.get(monthKey)?.total ?? 0);
    return {
      monthKey,
      month: monthLabel(monthKey),
      copy,
      hobani,
      sales,
      wallet,
      total: copy + hobani + sales + wallet,
      totalCopies: copyMap.get(monthKey)?.files ?? 0,
    };
  });

  const copy = rows.reduce((acc, row) => acc + row.copy, 0);
  const hobani = rows.reduce((acc, row) => acc + row.hobani, 0);
  const sales = rows.reduce((acc, row) => acc + row.sales, 0);
  const wallet = rows.reduce((acc, row) => acc + row.wallet, 0);
  const total = copy + hobani + sales + wallet;
  const totalCopies = rows.reduce((acc, row) => acc + row.totalCopies, 0);

  return {
    rows,
    copy,
    hobani,
    sales,
    wallet,
    total,
    copyPercent: percent(copy, total),
    hobaniPercent: percent(hobani, total),
    salesPercent: percent(sales, total),
    walletPercent: percent(wallet, total),
    totalCopies,
  };
}

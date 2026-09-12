import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cached } from "@/lib/cache";

export const HOBANI_TOTALS_CACHE_KEY = "hobani:totals";

export interface HobaniTotalRow {
  day: Date;
  dayKey: string;
  period: string;
  totalCards: number;
  totalAmount: number;
  totalCardValue: number;
}

export interface HobaniIncomeRecord {
  id: string;
  income: number;
  period: string;
  cardType: number | null;
  quantity: number;
  createdAt: Date;
  createdByName: string | null;
}

const HOBANI_TOTALS_TTL_MS = 30_000;

export function getHobaniTotals(): Promise<HobaniTotalRow[]> {
  return cached(HOBANI_TOTALS_CACHE_KEY, HOBANI_TOTALS_TTL_MS, computeHobaniTotals);
}

async function computeHobaniTotals(): Promise<HobaniTotalRow[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${schema.hobaniIncome.createdAt}), 'YYYY-MM-DD')`,
      period: schema.hobaniIncome.period,
      totalCards: sql<number>`coalesce(sum(${schema.hobaniIncome.quantity}), 0)`,
      totalAmount: sql<number>`coalesce(sum(${schema.hobaniIncome.income}), 0)`,
      totalCardValue: sql<number>`coalesce(sum(${schema.hobaniIncome.cardType} * ${schema.hobaniIncome.quantity}), 0)`,
    })
    .from(schema.hobaniIncome)
    .groupBy(
      sql`date_trunc('day', ${schema.hobaniIncome.createdAt})`,
      schema.hobaniIncome.period,
    )
    .orderBy(
      desc(sql`date_trunc('day', ${schema.hobaniIncome.createdAt})`),
      asc(schema.hobaniIncome.period),
    );

  return rows.map((row) => ({
    day: new Date(`${row.day}T00:00:00`),
    dayKey: row.day,
    period: row.period,
    totalCards: Number(row.totalCards ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    totalCardValue: Number(row.totalCardValue ?? 0),
  }));
}

export async function getHobaniIncomeRecords(
  day: string,
  period: string,
): Promise<HobaniIncomeRecord[]> {
  const rows = await db
    .select({
      id: schema.hobaniIncome.id,
      income: schema.hobaniIncome.income,
      period: schema.hobaniIncome.period,
      cardType: schema.hobaniIncome.cardType,
      quantity: schema.hobaniIncome.quantity,
      createdAt: schema.hobaniIncome.createdAt,
      createdByName: schema.users.name,
    })
    .from(schema.hobaniIncome)
    .leftJoin(schema.users, eq(schema.hobaniIncome.createdBy, schema.users.id))
    .where(
      and(
        sql`date_trunc('day', ${schema.hobaniIncome.createdAt}) = ${day}::date`,
        eq(schema.hobaniIncome.period, period),
      ),
    )
    .orderBy(asc(schema.hobaniIncome.createdAt));

  return rows.map((row) => ({
    ...row,
    income: Number(row.income),
  }));
}

export async function deleteHobaniIncomeByDayPeriod(
  day: string,
  period: string,
): Promise<number> {
  const deleted = await db
    .delete(schema.hobaniIncome)
    .where(
      and(
        sql`date_trunc('day', ${schema.hobaniIncome.createdAt}) = ${day}::date`,
        eq(schema.hobaniIncome.period, period),
      ),
    )
    .returning({ id: schema.hobaniIncome.id });

  return deleted.length;
}

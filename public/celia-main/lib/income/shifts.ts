import { sql, sum } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cached } from "@/lib/cache";
import { HOBANI_PERIODS } from "@/lib/hobani/income";

export type ShiftPeriod = "morning" | "evening";

export interface ShiftsDayRow {
  day: string;
  period: ShiftPeriod;
  copy: number;
  sales: number;
  hobani: number;
}

export interface ShiftsStats {
  rows: ShiftsDayRow[];
  totalCopy: number;
  totalSales: number;
  totalHobani: number;
  total: number;
}

const SHIFTS_TTL_MS = 60_000;

export function getShiftsStats(): Promise<ShiftsStats> {
  return cached("income:shifts", SHIFTS_TTL_MS, computeShiftsStats);
}

async function computeShiftsStats(): Promise<ShiftsStats> {
  const [copyRows, morningHobaniRows, eveningHobaniRows] = await Promise.all([
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${schema.copyRecords.createdAt}), 'YYYY-MM-DD')`,
        total: sum(schema.copyRecords.price),
      })
      .from(schema.copyRecords)
      .groupBy(sql`date_trunc('day', ${schema.copyRecords.createdAt})`),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${schema.hobaniIncome.createdAt}), 'YYYY-MM-DD')`,
        total: sum(schema.hobaniIncome.income),
      })
      .from(schema.hobaniIncome)
      .where(sql`${schema.hobaniIncome.period} = ${HOBANI_PERIODS[0]}`)
      .groupBy(sql`date_trunc('day', ${schema.hobaniIncome.createdAt})`),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${schema.hobaniIncome.createdAt}), 'YYYY-MM-DD')`,
        total: sum(schema.hobaniIncome.income),
      })
      .from(schema.hobaniIncome)
      .where(sql`${schema.hobaniIncome.period} = ${HOBANI_PERIODS[1]}`)
      .groupBy(sql`date_trunc('day', ${schema.hobaniIncome.createdAt})`),
  ]);

  const copyMap = new Map(copyRows.map((row) => [row.day, Number(row.total ?? 0)]));
  const morningMap = new Map(morningHobaniRows.map((row) => [row.day, Number(row.total ?? 0)]));
  const eveningMap = new Map(eveningHobaniRows.map((row) => [row.day, Number(row.total ?? 0)]));

  const days = Array.from(
    new Set([...copyMap.keys(), ...morningMap.keys(), ...eveningMap.keys()]),
  ).sort().reverse();

  const rows: ShiftsDayRow[] = [];
  for (const day of days) {
    const copy = copyMap.get(day) ?? 0;
    if (copy > 0 || (morningMap.get(day) ?? 0) > 0) {
      rows.push({ day, period: "morning", copy, sales: 0, hobani: morningMap.get(day) ?? 0 });
    }
    if (copy > 0 || (eveningMap.get(day) ?? 0) > 0) {
      rows.push({ day, period: "evening", copy, sales: 0, hobani: eveningMap.get(day) ?? 0 });
    }
  }

  const totalCopy = rows.reduce((acc, row) => acc + row.copy, 0);
  const totalSales = rows.reduce((acc, row) => acc + row.sales, 0);
  const totalHobani = rows.reduce((acc, row) => acc + row.hobani, 0);

  return {
    rows,
    totalCopy,
    totalSales,
    totalHobani,
    total: totalCopy + totalSales + totalHobani,
  };
}

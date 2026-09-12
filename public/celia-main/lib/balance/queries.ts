import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export interface BalanceChargeRow {
  id: string;
  provider: string;
  amount: number;
  notes: string | null;
  createdAt: Date;
  createdByName: string | null;
}

export interface BalanceChargesSummary {
  rows: BalanceChargeRow[];
  totalAmount: number;
  count: number;
}

export async function getBalanceCharges(): Promise<BalanceChargesSummary> {
  const rows = await db
    .select({
      id: schema.balanceCharge.id,
      provider: schema.balanceCharge.provider,
      amount: schema.balanceCharge.amount,
      notes: schema.balanceCharge.notes,
      createdAt: schema.balanceCharge.createdAt,
      createdByName: schema.users.name,
    })
    .from(schema.balanceCharge)
    .leftJoin(schema.users, sql`${schema.users.id} = ${schema.balanceCharge.createdBy}`)
    .orderBy(desc(schema.balanceCharge.createdAt));

  const list = rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    amount: Number(row.amount ?? 0),
    notes: row.notes,
    createdAt: row.createdAt,
    createdByName: row.createdByName,
  }));

  const totalAmount = list.reduce((acc, row) => acc + row.amount, 0);

  return { rows: list, totalAmount, count: list.length };
}

import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export interface ExpenseRow {
  id: string;
  type: string;
  amount: number;
  paymentMethod: string | null;
  expenseDate: Date;
  notes: string | null;
  createdAt: Date;
  createdByName: string | null;
}

export interface ExpensesSummary {
  rows: ExpenseRow[];
  totalAmount: number;
  count: number;
}

export async function getExpenses(): Promise<ExpensesSummary> {
  const rows = await db
    .select({
      id: schema.expenses.id,
      type: schema.expenses.type,
      amount: schema.expenses.amount,
      paymentMethod: schema.expenses.paymentMethod,
      expenseDate: schema.expenses.expenseDate,
      notes: schema.expenses.notes,
      createdAt: schema.expenses.createdAt,
      createdByName: schema.users.name,
    })
    .from(schema.expenses)
    .leftJoin(schema.users, sql`${schema.users.id} = ${schema.expenses.createdBy}`)
    .orderBy(desc(schema.expenses.expenseDate));

  const list = rows.map((row) => ({
    id: row.id,
    type: row.type,
    amount: Number(row.amount ?? 0),
    paymentMethod: row.paymentMethod,
    expenseDate: row.expenseDate,
    notes: row.notes,
    createdAt: row.createdAt,
    createdByName: row.createdByName,
  }));

  const totalAmount = list.reduce((acc, row) => acc + row.amount, 0);

  return { rows: list, totalAmount, count: list.length };
}

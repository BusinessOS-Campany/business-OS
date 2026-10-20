import { asc, desc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export interface EmployeeOption {
  id: string;
  name: string;
}

export async function getEmployees(): Promise<EmployeeOption[]> {
  return db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .orderBy(asc(schema.users.name));
}

export interface AdvanceRow {
  id: string;
  employeeId: string | null;
  employeeName: string;
  amount: number;
  advanceDate: Date;
  notes: string | null;
  createdAt: Date;
  createdByName: string | null;
}

export interface AdvancesSummary {
  rows: AdvanceRow[];
  totalAmount: number;
  count: number;
}

export async function getAdvances(): Promise<AdvancesSummary> {
  const rows = await db
    .select({
      id: schema.advances.id,
      employeeId: schema.advances.employeeId,
      employeeName: schema.advances.employeeName,
      amount: schema.advances.amount,
      advanceDate: schema.advances.advanceDate,
      notes: schema.advances.notes,
      createdAt: schema.advances.createdAt,
      createdByName: schema.users.name,
    })
    .from(schema.advances)
    .leftJoin(schema.users, sql`${schema.users.id} = ${schema.advances.createdBy}`)
    .orderBy(desc(schema.advances.advanceDate));

  const list = rows.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    amount: Number(row.amount ?? 0),
    advanceDate: row.advanceDate,
    notes: row.notes,
    createdAt: row.createdAt,
    createdByName: row.createdByName,
  }));

  const totalAmount = list.reduce((acc, row) => acc + row.amount, 0);

  return { rows: list, totalAmount, count: list.length };
}

import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export interface EmployeeRow {
  id: string;
  name: string;
  department: string | null;
  phone: string | null;
  salary: number | null;
  isActive: boolean;
  createdAt: Date;
  createdByName: string | null;
}

export interface EmployeesSummary {
  rows: EmployeeRow[];
  count: number;
  activeCount: number;
}

export async function getEmployees(): Promise<EmployeesSummary> {
  const rows = await db
    .select({
      id: schema.employees.id,
      name: schema.employees.name,
      department: schema.employees.department,
      phone: schema.employees.phone,
      salary: schema.employees.salary,
      isActive: schema.employees.isActive,
      createdAt: schema.employees.createdAt,
      createdByName: schema.users.name,
    })
    .from(schema.employees)
    .leftJoin(schema.users, sql`${schema.users.id} = ${schema.employees.createdBy}`)
    .orderBy(asc(schema.employees.name));

  const list = rows.map((row) => ({
    id: row.id,
    name: row.name,
    department: row.department,
    phone: row.phone,
    salary: row.salary === null ? null : Number(row.salary),
    isActive: row.isActive,
    createdAt: row.createdAt,
    createdByName: row.createdByName,
  }));

  return {
    rows: list,
    count: list.length,
    activeCount: list.filter((row) => row.isActive).length,
  };
}

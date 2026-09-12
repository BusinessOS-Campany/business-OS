import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  username: string | null;
  displayUsername: string | null;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  isActive: boolean;
  permissions: string[];
  createdAt: Date;
}

export interface UsersSummary {
  rows: UserRow[];
  count: number;
  activeCount: number;
  adminCount: number;
}

export async function getUsers(): Promise<UsersSummary> {
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      username: schema.users.username,
      displayUsername: schema.users.displayUsername,
      phone: schema.users.phone,
      role: schema.users.role,
      emailVerified: schema.users.emailVerified,
      isActive: schema.users.isActive,
      permissions: schema.users.permissions,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.name));

  return {
    rows,
    count: rows.length,
    activeCount: rows.filter((row) => row.isActive).length,
    adminCount: rows.filter((row) => row.role === "admin").length,
  };
}

export async function getUserProfile(userId: string): Promise<UserRow | null> {
  const [row] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      username: schema.users.username,
      displayUsername: schema.users.displayUsername,
      phone: schema.users.phone,
      role: schema.users.role,
      emailVerified: schema.users.emailVerified,
      isActive: schema.users.isActive,
      permissions: schema.users.permissions,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return row ?? null;
}

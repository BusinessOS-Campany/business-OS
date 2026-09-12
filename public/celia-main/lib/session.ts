import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
});

export const getUserPermissions = cache(async (userId: string): Promise<string[]> => {
  const rows = await db
    .select({ permissions: schema.users.permissions })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return rows[0]?.permissions ?? [];
});

export function isPermissionAllowed(
  permissions: string[],
  role: string | null | undefined,
  keys: string[],
): boolean {
  if (role === "admin") return true;
  if (keys.length === 0) return true;
  return keys.some((key) => permissions.includes(key));
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requirePagePermission(...keys: string[]) {
  const session = await requireUser();
  const permissions = await getUserPermissions(session.user.id);
  if (!isPermissionAllowed(permissions, session.user.role, keys)) {
    redirect("/forbidden");
  }
  return { session, permissions };
}

export type ApiPermissionGuard =
  | { allowed: true; permissions: string[] }
  | { allowed: false; response: NextResponse };

export async function requireApiPermission(
  userId: string,
  role: string | null | undefined,
  ...keys: string[]
): Promise<ApiPermissionGuard> {
  const permissions = await getUserPermissions(userId);
  if (!isPermissionAllowed(permissions, role, keys)) {
    return { allowed: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { allowed: true, permissions };
}

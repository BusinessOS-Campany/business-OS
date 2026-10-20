import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import type { PermissionMap } from "@/lib/permissions";

const COOKIE_NAME = "ycm_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  return new TextEncoder().encode(env("AUTH_SECRET"));
}

export interface SessionUser {
  id: string;
  email: string;
  nameAr?: string | null;
  nameEn?: string | null;
  roleId: string;
  roleKey: string;
  roleNameAr: string;
  roleNameEn: string;
  branchId?: string | null;
  employeeId?: string | null;
  permissions: string[];
  isAdmin: boolean;
}

interface SessionToken extends JWTPayload {
  uid?: string;
}

export async function createSession(userId: string): Promise<void> {
  const secret = secretKey();
  const token = await new SignJWT({ uid: userId } as SessionToken)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const uid = (payload as SessionToken).uid;
    return typeof uid === "string" && uid.length > 0 ? uid : null;
  } catch {
    return null;
  }
}

const SESSION_INCLUDE = {
  role: {
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  },
} as const;

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: SESSION_INCLUDE,
  });
  if (!user || !user.isActive) return null;

  const permissions = user.role.permissions.map(
    (rp) => rp.permission.key
  );
  const isAdmin = user.role.key === "super_admin" || user.role.key === "admin";

  return {
    id: user.id,
    email: user.email,
    nameAr: user.nameAr,
    nameEn: user.nameEn,
    roleId: user.roleId,
    roleKey: user.role.key,
    roleNameAr: user.role.nameAr,
    roleNameEn: user.role.nameEn,
    branchId: user.branchId,
    employeeId: user.employeeId,
    permissions,
    isAdmin,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export function can(user: SessionUser, module: string, action: string): boolean {
  if (user.isAdmin) return true;
  return user.permissions.includes(`${module}:${action}`) || user.permissions.includes(`${module}:manage`);
}

export function canAny(user: SessionUser, module: string, actions: string[]): boolean {
  return actions.some((a) => can(user, module, a));
}

export async function requirePermission(module: string, action = "read"): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, module, action)) {
    redirect("/403");
  }
  return user;
}

export interface ClientUser {
  id: string;
  nameAr: string | null | undefined;
  nameEn: string | null | undefined;
  email: string;
  roleKey: string;
  roleNameAr: string;
  roleNameEn: string;
  branchId: string | null | undefined;
  employeeId: string | null | undefined;
  permissions: string[];
  permissionMap: PermissionMap;
  isAdmin: boolean;
}

export function toClientUser(user: SessionUser): ClientUser {
  const permissionMap: Record<string, string[]> = {};
  for (const key of user.permissions) {
    const idx = key.lastIndexOf(":");
    if (idx === -1) continue;
    const module = key.slice(0, idx);
    const action = key.slice(idx + 1);
    if (!permissionMap[module]) permissionMap[module] = [];
    if (!permissionMap[module].includes(action)) {
      permissionMap[module].push(action);
    }
  }
  return {
    id: user.id,
    nameAr: user.nameAr,
    nameEn: user.nameEn,
    email: user.email,
    roleKey: user.roleKey,
    roleNameAr: user.roleNameAr,
    roleNameEn: user.roleNameEn,
    branchId: user.branchId,
    employeeId: user.employeeId,
    permissions: user.permissions,
    permissionMap: permissionMap as PermissionMap,
    isAdmin: user.isAdmin,
  };
}

export { COOKIE_NAME };
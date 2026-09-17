import "server-only";
import { prisma } from "@/lib/prisma";

export function getUsers(opts: { q?: string; roleId?: string; limit?: number } = {}) {
  const { q, roleId, limit = 100 } = opts;
  return prisma.user.findMany({
    where: {
      roleId: roleId || undefined,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
              { nameAr: { contains: q, mode: "insensitive" } },
              { nameEn: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      role: { select: { id: true, key: true, nameAr: true, nameEn: true } },
      branch: { select: { id: true, nameAr: true, nameEn: true } },
      employee: { select: { id: true, employeeNo: true, nameAr: true, nameEn: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { role: true, branch: true, employee: true },
  });
}

export function getRoles() {
  return prisma.role.findMany({
    include: {
      _count: { select: { users: true, permissions: true } },
    },
    orderBy: { key: "asc" },
  });
}

export function getRoleById(id: string) {
  return prisma.role.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });
}

export function getPermissions() {
  return prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { action: "asc" }],
  });
}

export function getBranches() {
  return prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { nameEn: "asc" },
    select: { id: true, nameAr: true, nameEn: true },
  });
}

export function getEmployeesForLink() {
  return prisma.employee.findMany({
    where: { user: null, employeeStatus: "ACTIVE" },
    orderBy: { nameEn: "asc" },
    select: { id: true, employeeNo: true, nameAr: true, nameEn: true },
  });
}

export async function getAdminStats() {
  const [users, activeUsers, roles, permissions, branches] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.branch.count(),
  ]);
  return { users, activeUsers, roles, permissions, branches };
}

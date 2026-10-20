import type { EmployeeCategory, EmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getEmployees(
  opts: { q?: string; type?: EmployeeCategory; status?: EmployeeStatus; limit?: number } = {}
) {
  return prisma.employee.findMany({
    where: {
      ...(opts.type ? { employeeType: opts.type } : {}),
      ...(opts.status ? { employeeStatus: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { employeeNo: { contains: opts.q, mode: "insensitive" as const } },
              { nameAr: { contains: opts.q } },
              { nameEn: { contains: opts.q } },
              { phone: { contains: opts.q } },
              { email: { contains: opts.q } },
              { department: { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }] } },
              { position: { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }] } },
              { specialty: { OR: [{ nameAr: { contains: opts.q } }, { nameEn: { contains: opts.q } }] } },
            ],
          }
        : {}),
    },
    include: {
      department: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      position: { select: { id: true, nameAr: true, nameEn: true } },
      specialty: { select: { id: true, nameAr: true, nameEn: true } },
      branch: { select: { id: true, code: true, nameAr: true, nameEn: true } },
    },
    orderBy: { employeeNo: "asc" },
    take: opts.limit ?? 100,
  });
}

export function getEmployeeById(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      position: { select: { id: true, nameAr: true, nameEn: true } },
      specialty: { select: { id: true, nameAr: true, nameEn: true } },
      branch: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      documents: { orderBy: { createdAt: "desc" } },
      user: { select: { id: true, username: true, email: true, isActive: true } },
    },
  });
}

export async function getEmployeeStats() {
  const [total, active, doctors, nurses] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { employeeStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { employeeType: "DOCTOR" } }),
    prisma.employee.count({ where: { employeeType: "NURSE" } }),
  ]);
  return { total, active, doctors, nurses };
}

export function departments() {
  return prisma.department.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { nameEn: "asc" }],
    select: { id: true, nameAr: true, nameEn: true },
    take: 200,
  });
}

export function positions() {
  return prisma.position.findMany({
    orderBy: { nameEn: "asc" },
    select: { id: true, nameAr: true, nameEn: true },
    take: 200,
  });
}

export function specialties() {
  return prisma.specialty.findMany({
    orderBy: { nameEn: "asc" },
    select: { id: true, nameAr: true, nameEn: true },
    take: 200,
  });
}

export function branches() {
  return prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { nameEn: "asc" },
    select: { id: true, code: true, nameAr: true, nameEn: true },
    take: 200,
  });
}
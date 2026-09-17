import "server-only";
import { prisma } from "@/lib/prisma";
import { getSettings, type AppSettings } from "@/lib/services/hospital";

export function getHospitalSettings(): Promise<AppSettings> {
  return getSettings();
}

export function getDepartments(opts: { q?: string; limit?: number } = {}) {
  const { q, limit = 100 } = opts;
  return prisma.department.findMany({
    where: q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { nameAr: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { branch: { select: { id: true, nameAr: true, nameEn: true } } },
    orderBy: [{ order: "asc" }, { nameEn: "asc" }],
    take: limit,
  });
}

export function getBranches() {
  return prisma.branch.findMany({
    orderBy: { nameEn: "asc" },
    select: { id: true, code: true, nameAr: true, nameEn: true, phone: true, email: true, isActive: true },
  });
}

export async function getSettingsStats() {
  const [departments, branches, services, users, beds] = await Promise.all([
    prisma.department.count(),
    prisma.branch.count(),
    prisma.service.count(),
    prisma.user.count(),
    prisma.bed.count(),
  ]);
  return { departments, branches, services, users, beds };
}

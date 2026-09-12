import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listInsuranceCompanies() {
  return prisma.insuranceCompany.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getInsuranceCompany(id: string) {
  const c = await prisma.insuranceCompany.findUnique({ where: { id } });
  if (!c || c.deletedAt) throw new NotFoundError('InsuranceCompany');
  return c;
}

export async function createInsuranceCompany(data: {
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  sortOrder?: number;
  active?: boolean;
}) {
  return prisma.insuranceCompany.create({
    data: {
      name: data.name,
      logoUrl: data.logoUrl ?? null,
      description: data.description ?? null,
      sortOrder: data.sortOrder ?? 0,
      active: data.active ?? true,
    },
  });
}

export async function updateInsuranceCompany(id: string, data: {
  name?: string;
  logoUrl?: string | null;
  description?: string | null;
  sortOrder?: number;
  active?: boolean;
}) {
  const existing = await prisma.insuranceCompany.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('InsuranceCompany');
  return prisma.insuranceCompany.update({ where: { id }, data });
}

export async function deleteInsuranceCompany(id: string) {
  const existing = await prisma.insuranceCompany.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('InsuranceCompany');
  await prisma.insuranceCompany.update({ where: { id }, data: { deletedAt: new Date() } });
}

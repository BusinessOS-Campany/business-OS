import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listPackages() {
  return prisma.package.findMany({
    where: { deletedAt: null },
    orderBy: [{ popular: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function getPackage(id: string) {
  const p = await prisma.package.findUnique({ where: { id } });
  if (!p || p.deletedAt) throw new NotFoundError('Package');
  return p;
}

export async function createPackage(data: {
  name: string;
  priceUsd: number;
  priceYer: number;
  features?: string[];
  popular?: boolean;
}) {
  return prisma.package.create({
    data: {
      name: data.name,
      priceUsd: data.priceUsd,
      priceYer: data.priceYer,
      features: data.features ?? [],
      popular: data.popular ?? false,
    },
  });
}

export async function updatePackage(id: string, data: {
  name?: string;
  priceUsd?: number;
  priceYer?: number;
  features?: string[];
  popular?: boolean;
}) {
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Package');
  return prisma.package.update({ where: { id }, data });
}

export async function deletePackage(id: string) {
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Package');
  await prisma.package.update({ where: { id }, data: { deletedAt: new Date() } });
}

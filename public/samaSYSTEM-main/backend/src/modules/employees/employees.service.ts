import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listEmployees(department?: string, all?: boolean) {
  const where: any = { deletedAt: null };
  if (!all) where.isActive = true;
  if (department) where.department = department;
  return prisma.employee.findMany({ where, orderBy: { name: 'asc' } });
}

export async function getEmployee(id: string) {
  const e = await prisma.employee.findUnique({ where: { id } });
  if (!e || e.deletedAt) throw new NotFoundError('Employee');
  return e;
}

export async function createEmployee(data: {
  name: string;
  department?: string;
  phone?: string;
  salary?: number;
}) {
  return prisma.employee.create({ data });
}

export async function updateEmployee(id: string, data: {
  name?: string;
  department?: string;
  phone?: string;
  salary?: number;
  isActive?: boolean;
}) {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Employee');
  return prisma.employee.update({ where: { id }, data });
}

export async function deleteEmployee(id: string) {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Employee');
  await prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } });
}

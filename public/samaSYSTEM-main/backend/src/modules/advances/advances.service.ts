import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listAdvances(employeeName?: string) {
  const where: any = { deletedAt: null };
  if (employeeName) where.employee = employeeName;
  return prisma.salaryAdvance.findMany({
    where,
    orderBy: { date: 'desc' },
  });
}

export async function listAdvancesByEmployee(employeeId: string, month?: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.deletedAt) throw new NotFoundError('Employee');
  const where: any = { deletedAt: null, employee: employee.name };
  if (month) where.date = { startsWith: month };
  const advances = await prisma.salaryAdvance.findMany({
    where,
    orderBy: { date: 'desc' },
  });
  return { employee, advances };
}

export async function getAdvance(id: string) {
  const advance = await prisma.salaryAdvance.findUnique({ where: { id } });
  if (!advance || advance.deletedAt) throw new NotFoundError('SalaryAdvance');
  return advance;
}

export async function createAdvance(data: {
  employee: string;
  specialty?: string;
  amount: number;
  date: string;
  notes?: string;
}) {
  return prisma.salaryAdvance.create({ data });
}

export async function updateAdvance(id: string, data: {
  employee?: string;
  specialty?: string;
  amount?: number;
  date?: string;
  notes?: string;
}) {
  const existing = await prisma.salaryAdvance.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('SalaryAdvance');
  return prisma.salaryAdvance.update({ where: { id }, data });
}

export async function deleteAdvance(id: string) {
  const existing = await prisma.salaryAdvance.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('SalaryAdvance');
  await prisma.salaryAdvance.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listExpenses() {
  return prisma.expense.findMany({
    where: { deletedAt: null },
    orderBy: { date: 'desc' },
  });
}

export async function getExpense(id: string) {
  const e = await prisma.expense.findUnique({ where: { id } });
  if (!e || e.deletedAt) throw new NotFoundError('Expense');
  return e;
}

export async function createExpense(data: {
  category: string;
  amount: number;
  date: string;
  paymentMethod?: string;
  employee?: string;
  notes?: string;
}) {
  return prisma.expense.create({ data });
}

export async function updateExpense(id: string, data: {
  category?: string;
  amount?: number;
  date?: string;
  paymentMethod?: string;
  employee?: string;
  notes?: string;
}) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Expense');
  return prisma.expense.update({ where: { id }, data });
}

export async function deleteExpense(id: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Expense');
  await prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
}

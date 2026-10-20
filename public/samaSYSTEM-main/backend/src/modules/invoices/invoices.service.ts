import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listInvoices() {
  return prisma.invoice.findMany({
    where: { deletedAt: null },
    orderBy: { date: 'desc' },
  });
}

export async function listInvoicesByMonth(month?: string) {
  const where: any = { deletedAt: null };
  if (month) where.date = { startsWith: month };
  return prisma.invoice.findMany({
    where,
    orderBy: { date: 'asc' },
  });
}

export async function getInvoice(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.deletedAt) throw new NotFoundError('Invoice');
  return invoice;
}

export async function createInvoice(data: {
  type: 'water' | 'electricity';
  amount: number;
  date: string;
  notes?: string;
}) {
  return prisma.invoice.create({ data });
}

export async function updateInvoice(id: string, data: {
  type?: 'water' | 'electricity';
  amount?: number;
  date?: string;
  notes?: string;
}) {
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Invoice');
  return prisma.invoice.update({ where: { id }, data });
}

export async function deleteInvoice(id: string) {
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Invoice');
  await prisma.invoice.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

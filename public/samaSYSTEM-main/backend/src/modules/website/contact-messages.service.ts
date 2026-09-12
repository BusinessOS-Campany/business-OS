import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listContactMessages() {
  return prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getContactMessage(id: string) {
  const m = await prisma.contactMessage.findUnique({ where: { id } });
  if (!m) throw new NotFoundError('ContactMessage');
  return m;
}

export async function updateContactMessage(id: string, data: { isResolved?: boolean; reply?: string }) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('ContactMessage');
  const updateData: { isResolved?: boolean; reply?: string; repliedAt?: Date } = { ...data };
  if (data.reply !== undefined) {
    updateData.repliedAt = new Date();
  }
  return prisma.contactMessage.update({ where: { id }, data: updateData });
}

export async function deleteContactMessage(id: string) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('ContactMessage');
  await prisma.contactMessage.delete({ where: { id } });
}

import { prisma } from '../../config/database.js';

export async function create(type: string, data?: Record<string, unknown>) {
  return prisma.notification.create({
    data: { type, data: data ? JSON.stringify(data) : null },
  });
}

export async function list() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.notification.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function unreadCount() {
  return prisma.notification.count({ where: { readAt: null } });
}

export async function markRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
}

export async function markAllRead() {
  await prisma.notification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
}

export async function deleteOld() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.notification.deleteMany({ where: { createdAt: { lt: since } } });
}

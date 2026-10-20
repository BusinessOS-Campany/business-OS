import { prisma } from '../config/database.js';

export async function notify(type: string, data?: Record<string, unknown>) {
  await prisma.notification.create({
    data: { type, data: data ? JSON.stringify(data) : null },
  });
}

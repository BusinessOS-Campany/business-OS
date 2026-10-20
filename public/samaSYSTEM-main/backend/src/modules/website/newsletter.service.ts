import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listNewsletterSubscribers() {
  return prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function deleteNewsletterSubscriber(id: string) {
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('NewsletterSubscriber');
  await prisma.newsletterSubscriber.delete({ where: { id } });
}

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env.js';

function createPrisma() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in Vercel env vars');
  }
  const pgUrl = env.DATABASE_URL.replace(/\?schema=[^&]*$/, "");
  const adapter = new PrismaPg({ connectionString: pgUrl }, { schema: "sama" });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

let _prisma: PrismaClient | null = null;

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_prisma) _prisma = createPrisma();
    return (_prisma as any)[prop];
  },
});

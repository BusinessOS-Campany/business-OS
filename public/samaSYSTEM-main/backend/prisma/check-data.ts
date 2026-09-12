import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const sessions = await prisma.session.findMany({
    where: { deletedAt: null, subscriptionDay: { not: null } },
    select: { id: true, fullname: true, subscriptionDay: true, subscriptionAttendance: true, subscriptionPeriod: true },
  });
  for (const s of sessions) {
    let count = 0;
    try {
      const att = JSON.parse(s.subscriptionAttendance || '{}');
      count = Array.isArray(att) ? att.length : (att.a?.length || 0);
    } catch {}
    const remaining = (s.subscriptionDay ?? 0) - count;
    console.log(`${s.fullname}: total=${s.subscriptionDay}, attended=${count}, remaining=${remaining} (period=${s.subscriptionPeriod})`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const sessions = await prisma.session.findMany({
    where: { deletedAt: null },
    select: { id: true, fullname: true, subscriptionDay: true, subscriptionAttendance: true, subscriptionPeriod: true },
  });

  let fixed = 0;
  for (const s of sessions) {
    const expectedTotal = s.subscriptionPeriod === 'شهر' ? 30 : s.subscriptionPeriod === 'أسبوع' ? 7 : (s.subscriptionDay ?? 1);
    if ((s.subscriptionDay ?? 0) !== expectedTotal) {
      await prisma.session.update({
        where: { id: s.id },
        data: { subscriptionDay: expectedTotal },
      });
      fixed++;
    }
  }

  console.log(`Fixed ${fixed} sessions`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

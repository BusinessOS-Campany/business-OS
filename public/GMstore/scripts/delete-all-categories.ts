import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Deleting all categories...");
  // Delete child categories first, then parents
  await prisma.category.updateMany({ data: { parentId: null } });
  await prisma.category.deleteMany({});
  const count = await prisma.category.count();
  console.log(`✅ Deleted all categories. Remaining: ${count}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });

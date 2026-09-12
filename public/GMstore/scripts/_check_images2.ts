import { PrismaClient } from "@prisma/client";
async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: "postgresql://postgres:123@localhost:5432/gmstore" } },
  });
  const cats = await prisma.category.findMany({ take: 10, orderBy: { name: "asc" } });
  for (const c of cats) {
    console.log(c.slug + "\t" + (c.image ?? "NULL"));
  }
  await prisma.$disconnect();
}
main();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cat = await prisma.category.create({
    data: { name: "عام", nameEn: "General", slug: "general" },
  });
  console.log("Created fallback category:", cat.id);

  const r = await prisma.product.updateMany({
    where: { OR: [{ categoryId: "" }, { categoryId: null }] },
    data: { categoryId: cat.id },
  });
  console.log("Fixed products:", r.count);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });

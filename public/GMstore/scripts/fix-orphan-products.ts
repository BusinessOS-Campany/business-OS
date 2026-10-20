import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find products with invalid categoryId
  const orphaned = await prisma.product.findMany({
    where: {
      OR: [
        { categoryId: "" },
        { categoryId: { equals: undefined } },
      ],
    },
    select: { id: true, name: true, categoryId: true },
  });
  console.log(`Orphaned products: ${orphaned.length}`);

  // Get the first available category as fallback
  const fallback = await prisma.category.findFirst({ select: { id: true, name: true } });
  if (!fallback) {
    console.error("No categories exist! Create one first.");
    process.exit(1);
  }
  console.log(`Fallback category: ${fallback.name} (${fallback.id})`);

  if (orphaned.length > 0) {
    const ids = orphaned.map((p) => p.id);
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { categoryId: fallback.id },
    });
    console.log(`Fixed ${orphaned.length} orphaned products`);
  } else {
    console.log("No orphaned products found");
  }

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });

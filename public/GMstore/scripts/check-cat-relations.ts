import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const productsWithCategory = await prisma.product.findMany({
    where: { categoryId: { not: undefined } },
    select: { id: true, name: true, categoryId: true },
    take: 5,
  });
  console.log(`Products with category: ${productsWithCategory.length} (showing first 5)`);
  for (const p of productsWithCategory) {
    console.log(`  ${p.name} -> categoryId: ${p.categoryId}`);
  }

  const totalProducts = await prisma.product.count();
  const cats = await prisma.category.count();
  const prodInCats = await prisma.product.count({ where: { categoryId: { not: undefined } } });
  console.log(`\nTotal products: ${totalProducts}`);
  console.log(`Total categories: ${cats}`);
  console.log(`Products with categoryId: ${prodInCats}`);

  // Check category tree depth
  const topLevel = await prisma.category.findMany({ where: { parentId: null }, take: 5 });
  console.log(`\nTop-level categories (sample):`);
  for (const c of topLevel) {
    const children = await prisma.category.count({ where: { parentId: c.id } });
    console.log(`  ${c.name} (${c.slug}) -> ${children} children`);
  }

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });

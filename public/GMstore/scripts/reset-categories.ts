import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Deleting all categories...");
  // Drop FK constraint temporarily, delete, then re-create
  await prisma.$executeRawUnsafe('ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey"');
  console.log("  FK dropped");
  await prisma.$executeRawUnsafe('ALTER TABLE "Product" ALTER COLUMN "categoryId" SET DEFAULT \'\'');
  await prisma.$executeRawUnsafe('UPDATE "Product" SET "categoryId" = \'\'');
  console.log("  Products updated");
  await prisma.$executeRawUnsafe('UPDATE "Category" SET "parentId" = NULL');
  console.log("  Parent refs cleared");
  const result = await prisma.$executeRawUnsafe('DELETE FROM "Category"');
  console.log(`  Deleted ${result} categories`);

  // Re-add FK constraint
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"(id)'
  );
  console.log("  FK re-added");
  console.log("✅ Done. Now sync CJ categories.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });

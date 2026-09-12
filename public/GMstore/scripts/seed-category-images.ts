import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const parentColors: Record<string, string> = {
  electronics: "4A90D9",
  fashion: "E91E63",
  "home-kitchen": "FF9800",
  beauty: "9C27B0",
  "baby-kids": "00BCD4",
  sports: "4CAF50",
  automotive: "607D8B",
  books: "795548",
  gaming: "F44336",
  pets: "8BC34A",
  food: "FF5722",
  office: "3F51B5",
  tools: "6D4C41",
  industrial: "37474F",
  digital: "2196F3",
  misc: "9E9E9E",
};

async function main() {
  const allCategories = await prisma.category.findMany();
  let updated = 0;

  for (const cat of allCategories) {
    const color = parentColors[cat.slug] || parentColors[cat.parentId || ""] || "CCCCCC";
    const image = `https://placehold.co/200x200/${color}/FFFFFF?text=${encodeURIComponent(cat.name)}`;
    await prisma.category.update({
      where: { id: cat.id },
      data: { image },
    });
    updated++;
  }

  console.log(`Updated ${updated} categories with placeholder images.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

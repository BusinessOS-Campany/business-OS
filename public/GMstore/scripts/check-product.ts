import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.product.findFirst({ where: { slug: "haitham-1" } });
  if (p) {
    console.log(JSON.stringify({
      name: p.name,
      nameEn: p.nameEn,
      images: p.images,
      colors: p.colors,
      sizes: p.sizes,
      price: Number(p.price),
      stock: p.stock,
      discount: p.discount,
      dealEnd: p.dealEnd,
      description: p.description,
      descriptionEn: p.descriptionEn,
      brand: p.brand,
      specs: p.specs,
      colorStock: p.colorStock,
      colorImages: p.colorImages,
      videoUrl: p.videoUrl,
    }, null, 2));
  } else {
    console.log("Product not found");
  }
  await prisma.$disconnect();
}
main();

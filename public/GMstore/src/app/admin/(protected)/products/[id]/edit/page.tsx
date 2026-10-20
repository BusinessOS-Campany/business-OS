import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { T } from "@/components/translate";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product: any = null;
  let categories: any[] = [];
  try {
    [product, categories] = await Promise.all([
      prisma.product.findUnique({ where: { id } }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
    ]);
  } catch { product = null; categories = []; }
  if (!product) notFound();
  const plainProduct = { ...product, price: Number(product.price) };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold"><T k="admin.edit_product" /></h1>
      <ProductForm categories={categories} product={plainProduct} />
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { getServerTranslations } from "@/lib/i18n/server";

export default async function MerchantEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getServerTranslations();
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();
  const plainProduct = { ...product, price: Number(product.price) };
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">{t("admin.edit_product")}</h1>
      <ProductForm categories={categories} product={plainProduct} backUrl="/merchant" />
    </div>
  );
}

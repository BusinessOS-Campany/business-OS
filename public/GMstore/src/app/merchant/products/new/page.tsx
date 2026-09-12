import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";
import { getServerTranslations } from "@/lib/i18n/server";

export default async function MerchantNewProductPage() {
  const { t } = await getServerTranslations();
  const [categories, existing] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ select: { slug: true } }),
  ]);
  const existingSlugs = existing.map(p => p.slug);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">{t("admin.add_product")}</h1>
      <ProductForm categories={categories} backUrl="/merchant" existingSlugs={existingSlugs} />
    </div>
  );
}

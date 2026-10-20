import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";
import { getServerTranslations } from "@/lib/i18n/server";

export default async function NewProductPage() {
  const { t } = await getServerTranslations();
  let categories: any[] = [];
  let existingSlugs: string[] = [];
  try {
    const [cats, existing] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.product.findMany({ select: { slug: true } }),
    ]);
    categories = cats;
    existingSlugs = existing.map(p => p.slug);
  } catch { categories = []; existingSlugs = []; }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.add_product")}</h1>
      <ProductForm categories={categories} existingSlugs={existingSlugs} />
    </div>
  );
}

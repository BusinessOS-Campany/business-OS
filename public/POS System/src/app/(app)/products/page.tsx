import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { ProductsClient } from "@/components/products/products-client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";
  const canView = can(tenant, "product.view");
  const canManage = can(tenant, "product.manage");

  if (!canView) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية عرض المنتجات" : "No permission to view products"}</p>
      </div>
    );
  }

  const branch = await prisma.branch.findUnique({
    where: { id: tenant.branchId },
    select: { warehouseId: true },
  });
  let warehouseId = branch?.warehouseId ?? null;
  if (!warehouseId) {
    const main = await prisma.warehouse.findFirst({ where: { companyId: tenant.companyId, isMain: true } });
    warehouseId = main?.id ?? null;
  }

  const [prods, categories, units] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: tenant.companyId },
      select: {
        id: true, sku: true, barcode: true, nameAr: true, nameEn: true,
        price: true, cost: true, wholesalePrice: true, minPrice: true, minStock: true,
        isActive: true, isFavorite: true, trackInventory: true, allowNegativeStock: true,
        type: true, categoryId: true,
        category: { select: { name: true, nameAr: true } },
        unit: { select: { name: true, nameAr: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.category.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, name: true, nameAr: true, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.unit.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, name: true, nameAr: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const stockByProduct = new Map<string, number>();
  if (warehouseId) {
    const invs = await prisma.inventory.findMany({
      where: { productId: { in: prods.map((p) => p.id) }, warehouseId },
      select: { productId: true, quantity: true },
    });
    for (const i of invs) stockByProduct.set(i.productId, b2n(i.quantity));
  }

  return (
    <ProductsClient
      lang={lang}
      currency={tenant.currency}
      canManage={canManage}
      categories={categories.map((c) => ({ id: c.id, name: lang === "ar" ? c.nameAr || c.name : c.name }))}
      units={units.map((u) => ({ id: u.id, name: lang === "ar" ? u.nameAr || u.name : u.name }))}
      products={prods.map((p) => ({
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        price: b2n(p.price),
        cost: b2n(p.cost),
        wholesalePrice: b2n(p.wholesalePrice),
        minPrice: b2n(p.minPrice),
        minStock: Number(String(p.minStock ?? 0)),
        isActive: p.isActive,
        isFavorite: p.isFavorite,
        trackInventory: p.trackInventory,
        allowNegativeStock: p.allowNegativeStock,
        type: p.type,
        categoryId: p.categoryId,
        categoryName: lang === "ar" ? p.category?.nameAr || p.category?.name || "" : p.category?.name || "",
        unitName: lang === "ar" ? p.unit?.nameAr || p.unit?.name || "" : p.unit?.name || "",
        stock: stockByProduct.get(p.id) ?? 0,
      }))}
    />
  );
}
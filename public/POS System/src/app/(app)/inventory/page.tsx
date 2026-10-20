import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { InventoryClient } from "@/components/inventory/inventory-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";
  const canAdjust = can(tenant, "inventory.adjust");

  if (!can(tenant, "inventory.view")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية عرض المخزون" : "No permission to view inventory"}</p>
      </div>
    );
  }

  const [warehouses, prods, invs] = await Promise.all([
    prisma.warehouse.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, name: true, nameAr: true, isMain: true },
      orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
    }),
    prisma.product.findMany({
      where: { companyId: tenant.companyId },
      select: {
        id: true, sku: true, nameAr: true, nameEn: true, minStock: true,
        trackInventory: true, allowNegativeStock: true,
        unit: { select: { name: true, nameAr: true } },
        price: true,
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.inventory.findMany({
      where: { companyId: tenant.companyId },
      select: { warehouseId: true, productId: true, quantity: true },
    }),
  ]);

  const mainId = warehouses.find((w) => w.isMain)?.id ?? warehouses[0]?.id ?? null;
  const stock = new Map<string, Map<string, number>>();
  for (const i of invs) {
    let m = stock.get(i.productId);
    if (!m) {
      m = new Map();
      stock.set(i.productId, m);
    }
    m.set(i.warehouseId, b2n(i.quantity));
  }

  return (
    <InventoryClient
      lang={lang}
      currency={tenant.currency}
      canAdjust={canAdjust}
      mainWarehouseId={mainId}
      warehouses={warehouses.map((w) => ({ id: w.id, name: lang === "ar" ? w.nameAr || w.name : w.name, isMain: w.isMain }))}
      products={prods.map((p) => ({
        id: p.id,
        sku: p.sku,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        minStock: Number(String(p.minStock ?? 0)),
        trackInventory: p.trackInventory,
        allowNegativeStock: p.allowNegativeStock,
        unitName: lang === "ar" ? p.unit?.nameAr || p.unit?.name || "" : p.unit?.name || "",
        price: b2n(p.price),
        totalStock: Array.from(stock.get(p.id)?.values() ?? []).reduce((a, b) => a + b, 0),
        warehouseStock: stock.get(p.id),
      }))}
    />
  );
}
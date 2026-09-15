import { cookies } from "next/headers";
import { Boxes, Warehouse, ArrowDownUp } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getInventoryItems, getWarehouses } from "@/lib/services/pharmacy";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicinesTable, type MedicineRow } from "@/features/pharmacy/medicines-table";

export const metadata = { title: "Inventory" };

const toRows = (items: Array<Awaited<ReturnType<typeof getInventoryItems>>[number]>): MedicineRow[] =>
  items.map((it) => ({
    id: it.id,
    code: it.code,
    nameAr: it.nameAr,
    nameEn: it.nameEn,
    category: it.category,
    unit: it.unit,
    strength: it.strength ?? "",
    totalStock: it.totalStock,
    reorderLevel: it.reorderLevel,
    isLowStock: it.isLowStock,
    expiringSoonCount: it.expiringSoonCount,
    nearestExpiry: it.nearestExpiry?.toISOString() ?? null,
  }));

export default async function InventoryPage() {
  await requirePermission("inventory");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>(
      (o, k) => (o as Record<string, unknown>)?.[k],
      messages
    );
    return typeof value === "string" ? value : key;
  };

  const [items, lowStock, warehouses] = await Promise.all([
    getInventoryItems(),
    getInventoryItems({ lowStock: true }),
    getWarehouses(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("inventory.title")}
        description={t("inventory.stockLevels")}
        icon={<Boxes />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("inventory.items")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{items.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("inventory.lowStockItems")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-destructive">{lowStock.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("pharmacy.warehouses")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{warehouses.length}</p>
        </Card>
        <Card className="flex items-center justify-center p-4">
          <ArrowDownUp className="size-5 text-muted-foreground" />
        </Card>
      </div>

      <MedicinesTable rows={toRows(items)} locale={locale} />
    </div>
  );
}
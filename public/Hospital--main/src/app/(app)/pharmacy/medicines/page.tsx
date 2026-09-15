import { cookies } from "next/headers";
import { Boxes } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getInventoryItems } from "@/lib/services/pharmacy";
import { PageHeader } from "@/components/ui/page-header";
import { MedicinesTable, type MedicineRow } from "@/features/pharmacy/medicines-table";

export const metadata = { title: "Medicine Catalog" };

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requirePermission("pharmacy");
  const { category } = await searchParams;
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

  const items = await getInventoryItems({ category });

  const rows: MedicineRow[] = items.map((it) => ({
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("pharmacy.medicines")}
        description={t("pharmacy.inventoryItems")}
        icon={<Boxes />}
      />
      <MedicinesTable rows={rows} locale={locale} />
    </div>
  );
}
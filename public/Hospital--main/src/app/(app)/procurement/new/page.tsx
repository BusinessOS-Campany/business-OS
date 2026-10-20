import { cookies } from "next/headers";
import { ShoppingCart } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getSuppliers, getWarehouses, getInventoryItems } from "@/lib/services/pharmacy";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { PoForm } from "@/features/pharmacy/po-form";

export const metadata = { title: "New Purchase Order" };

export default async function NewPurchaseOrderPage() {
  await requirePermission("procurement", "create");
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

  const [suppliers, warehouses, items] = await Promise.all([
    getSuppliers(),
    getWarehouses(),
    getInventoryItems(),
  ]);

  const breadcrumbs: Crumb[] = [
    { label: t("pharmacy.title"), href: "/pharmacy" },
    { label: t("pharmacy.purchaseOrders"), href: "/procurement" },
    { label: t("pharmacy.newPurchaseOrder") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("pharmacy.newPurchaseOrder")}
        icon={<ShoppingCart />}
        breadcrumbs={breadcrumbs}
      />
      <PoForm
        suppliers={suppliers.map((s) => ({ id: s.id, nameAr: s.nameAr, nameEn: s.nameEn }))}
        warehouses={warehouses.map((w) => ({ id: w.id, nameAr: w.nameAr, nameEn: w.nameEn }))}
        items={items.map((it) => ({ id: it.id, nameAr: it.nameAr, nameEn: it.nameEn, unit: it.unit }))}
        locale={locale}
      />
    </div>
  );
}
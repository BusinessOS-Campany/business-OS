import { cookies } from "next/headers";
import { PackagePlus } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { ItemForm } from "@/features/pharmacy/item-form";

export const metadata = { title: "New Item" };

export default async function NewItemPage() {
  await requirePermission("inventory", "create");
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

  const breadcrumbs: Crumb[] = [
    { label: t("pharmacy.title"), href: "/pharmacy" },
    { label: t("pharmacy.medicines"), href: "/pharmacy/medicines" },
    { label: t("pharmacy.newItem") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t("pharmacy.newItem")} icon={<PackagePlus />} breadcrumbs={breadcrumbs} />
      <ItemForm locale={locale} />
    </div>
  );
}
import { cookies } from "next/headers";
import { PlusCircle } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getServices, getBillingPatients } from "@/lib/services/billing";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { InvoiceForm } from "@/features/billing/invoice-form";

export const metadata = { title: "New Invoice" };

const dec = (v: { toNumber(): number } | number) =>
  typeof v === "number" ? v : Number(v.toNumber());

export default async function NewInvoicePage() {
  await requirePermission("billing", "create");
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

  const [patients, services] = await Promise.all([getBillingPatients(), getServices()]);

  const breadcrumbs: Crumb[] = [{ label: t("billing.title"), href: "/billing" }, { label: t("billing.newInvoice") }];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("billing.newInvoice")}
        icon={<PlusCircle />}
        breadcrumbs={breadcrumbs}
      />
      <InvoiceForm
        patients={patients.map((p) => ({ id: p.id, nameAr: p.nameAr, nameEn: p.nameEn, mrn: p.mrn, phone: p.phone }))}
        services={services.map((s) => ({
          id: s.id,
          code: s.code,
          nameAr: s.nameAr,
          nameEn: s.nameEn,
          type: s.type,
          price: String(dec(s.price)),
        }))}
        locale={locale}
      />
    </div>
  );
}
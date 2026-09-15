import Link from "next/link";
import { cookies } from "next/headers";
import { Wallet, Plus, FileText } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getInvoices, getBillingStats } from "@/lib/services/billing";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { InvoicesTable, type InvoiceTableRow } from "@/features/billing/invoices-table";

export const metadata = { title: "Billing" };

const dec = (v: { toNumber(): number } | number) =>
  typeof v === "number" ? v : Number(v.toNumber());

export default async function BillingPage() {
  await requirePermission("billing");
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

  const [invoices, stats] = await Promise.all([getInvoices(), getBillingStats()]);

  const rows: InvoiceTableRow[] = invoices.map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    patientId: inv.patient.id,
    patientNameAr: inv.patient.nameAr,
    patientNameEn: inv.patient.nameEn,
    patientMrn: inv.patient.mrn,
    issuedAt: inv.issuedAt.toISOString(),
    total: String(dec(inv.total)),
    paidAmount: String(dec(inv.paidAmount)),
    dueAmount: String(dec(inv.dueAmount)),
    currency: inv.currency,
    status: inv.status,
  }));

  const fmt = (n: number) =>
    n.toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("billing.title")}
        description={t("billing.invoices")}
        icon={<Wallet />}
        actions={
          <Button asChild size="sm">
            <Link href="/billing/new">
              <Plus className="size-3.5" />
              {t("billing.newInvoice")}
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={FileText} label={t("billing.outstanding")} value={`${fmt(dec(stats.outstanding))} YER`} />
        <StatCard icon={Wallet} label={t("billing.partiallyPaid")} value={String(stats.partial)} />
        <StatCard icon={FileText} label={t("billing.paid")} value={String(stats.paid)} />
        <StatCard icon={Wallet} label={t("billing.title")} value={`${fmt(dec(stats.todayTotal))} YER`} />
      </div>

      <InvoicesTable rows={rows} locale={locale} />
    </div>
  );
}
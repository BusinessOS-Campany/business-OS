import { cookies } from "next/headers";
import { Banknote, CircleDollarSign, CalendarDays, Undo2 } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getPayments, getRefunds, getPaymentStats } from "@/lib/services/payments";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PaymentsTable, type PaymentRow } from "@/features/payments/payments-table";
import { RefundsTable, type RefundRow } from "@/features/payments/refunds-table";

export const metadata = { title: "Payments" };

const dec = (v: { toNumber(): number } | number) =>
  typeof v === "number" ? v : Number(v.toNumber());

export default async function PaymentsPage() {
  await requirePermission("payments");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [payments, refunds, stats] = await Promise.all([
    getPayments({ limit: 50 }),
    getRefunds({ limit: 50 }),
    getPaymentStats(),
  ]);

  const paymentRows: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    paymentNo: p.paymentNo,
    invoiceId: p.invoice?.id ?? null,
    invoiceNo: p.invoice?.invoiceNo ?? null,
    patientId: p.patient?.id ?? null,
    patientNameAr: p.patient?.nameAr ?? null,
    patientNameEn: p.patient?.nameEn ?? null,
    mrn: p.patient?.mrn ?? null,
    method: p.method,
    amount: dec(p.amount).toFixed(2),
    currency: p.currency,
    status: p.status,
    cashierNameAr: p.cashier?.nameAr ?? null,
    cashierNameEn: p.cashier?.nameEn ?? null,
    paidAt: p.paidAt.toISOString(),
  }));

  const refundRows: RefundRow[] = refunds.map((r) => ({
    id: r.id,
    refundNo: r.refundNo,
    invoiceId: r.invoice.id,
    invoiceNo: r.invoice.invoiceNo,
    paymentId: r.payment?.id ?? null,
    paymentNo: r.payment?.paymentNo ?? null,
    amount: dec(r.amount).toFixed(2),
    reason: r.reason,
    status: r.status,
    cashierNameAr: r.cashier?.nameAr ?? null,
    cashierNameEn: r.cashier?.nameEn ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  const fmt = (n: number) =>
    n.toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("payments.title")}
        description={t("payments.transactions")}
        icon={<Banknote />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label={t("common.today")} value={String(stats.todayCount)} variant="info" />
        <StatCard icon={CircleDollarSign} label={t("payments.record")} value={`${fmt(stats.todaySum)} YER`} variant="success" />
        <StatCard icon={Banknote} label={t("payments.title")} value={`${fmt(stats.totalSum)} YER`} variant="primary" />
        <StatCard icon={Undo2} label={t("payments.refunds")} value={`${fmt(stats.refundSum)} YER`} variant="warning" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="size-4 text-primary" />
            {t("payments.title")} ({paymentRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("payments.noPayments")}</p>
          ) : (
            <PaymentsTable rows={paymentRows} locale={locale} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Undo2 className="size-4 text-primary" />
            {t("payments.refunds")} ({refundRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {refundRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("payments.refunds")}</p>
          ) : (
            <RefundsTable rows={refundRows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
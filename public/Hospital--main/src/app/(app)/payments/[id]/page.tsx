import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Banknote, ArrowLeft, FileText, User, Undo2, CalendarClock, Hash } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getPaymentById } from "@/lib/services/payments";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefundForm } from "@/features/payments/refund-form";

export const metadata = { title: "Payment" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "info" | "warning" | "success" | "destructive" | "muted" | "outline"> = {
  PENDING: "warning",
  COMPLETED: "success",
  FAILED: "destructive",
  REFUNDED: "info",
  CANCELLED: "muted",
};

const METHOD_KEY: Record<string, string> = {
  CASH: "payments.methodCash",
  BANK_TRANSFER: "payments.methodBankTransfer",
  CARD: "payments.methodCard",
  CHEQUE: "payments.methodCheque",
  MOBILE_PAYMENT: "payments.methodMobilePayment",
  INSURANCE: "payments.methodInsurance",
  OTHER: "payments.methodOther",
};

const dec = (v: { toNumber(): number } | number) =>
  typeof v === "number" ? v : Number(v.toNumber());

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("payments");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const payment = await getPaymentById(id);
  if (!payment) notFound();

  const patientName = payment.patient ? (locale === "ar" ? payment.patient.nameAr : payment.patient.nameEn) : null;
  const cashierName = payment.cashier ? (locale === "ar" ? payment.cashier.nameAr : payment.cashier.nameEn) : null;
  const canRefund = payment.status === "COMPLETED" && payment.invoiceId !== null;

  const breadcrumbs: Crumb[] = [
    { label: t("payments.title"), href: "/payments" },
    { label: payment.paymentNo },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={payment.paymentNo}
        description={formatDateTime(payment.paidAt, locale)}
        icon={<Banknote />}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[payment.status] ?? "outline"}>{payment.status}</Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/payments">
                <ArrowLeft className="size-4" /> {t("common.back")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="size-3.5" /> {t("common.patient")}
                </p>
                {payment.patient ? (
                  <Link href={`/patients/${payment.patient.id}`} className="block">
                    <p className="font-medium hover:underline">{patientName}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{payment.patient.mrn}</p>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Hash className="size-3.5" /> {t("payments.title")}
                </p>
                {payment.invoice ? (
                  <Link href={`/billing/${payment.invoice.id}`} className="block">
                    <p className="font-medium text-primary hover:underline">{payment.invoice.invoiceNo}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {t("billing.total") ?? "Total"}: {dec(payment.invoice.total).toLocaleString()} YER
                    </p>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("payments.method")}</p>
                <Badge variant="outline">{t(METHOD_KEY[payment.method] ?? "payments.methodOther")}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("common.notes")}</p>
                <p className="whitespace-pre-wrap text-sm">{payment.note ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("payments.reference")}</p>
                <p className="text-sm">{payment.reference ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("billing.cashier") ?? "Cashier"}</p>
                <p className="text-sm">{cashierName ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-row items-center justify-between">
            <CardContent className="flex items-center gap-3 py-5">
              <CalendarClock className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("billing.issuedAt") ?? "Paid at"}</p>
                <p className="text-sm font-medium">{formatDateTime(payment.paidAt, locale)}</p>
              </div>
            </CardContent>
            <CardContent className="text-end">
              <p className="text-xs text-muted-foreground">{t("common.amount")}</p>
              <p className="text-2xl font-semibold tabular-nums">{dec(payment.amount).toLocaleString()} {payment.currency}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {canRefund && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Undo2 className="size-4 text-primary" />
                  {t("payments.refund")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RefundForm paymentId={payment.id} maxAmount={dec(payment.amount).toFixed(2)} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Undo2 className="size-4 text-primary" />
                {t("payments.refunds")} ({payment.refunds.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payment.refunds.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">{t("payments.refunds")}</p>
              ) : (
                <ul className="divide-y">
                  {payment.refunds.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{r.refundNo}</p>
                        <p className="truncate text-xs">{r.reason ?? "—"}</p>
                      </div>
                      <div className="text-end">
                        <p className="font-semibold tabular-nums text-destructive">−{dec(r.amount).toLocaleString()} YER</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt, locale)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
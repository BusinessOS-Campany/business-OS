import type * as React from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { FileText, UserRound, Banknote, Undo2, Clock3, Hash, Landmark } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getInvoiceById } from "@/lib/services/billing";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InvoiceActions } from "@/features/billing/invoice-actions";
import { PaymentForm } from "@/features/billing/payment-form";

export const metadata = { title: "Invoice" };

const STATUS_KEY: Record<string, string> = {
  DRAFT: "statusDraft",
  ISSUED: "statusIssued",
  PARTIALLY_PAID: "statusPartiallyPaid",
  PAID: "statusPaid",
  VOID: "statusVoid",
  REFUNDED: "statusRefunded",
};

const STATUS_COLOR: Record<string, "default" | "destructive" | "outline" | "secondary" | "success" | "warning" | "info" | "muted"> = {
  DRAFT: "secondary",
  ISSUED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  VOID: "destructive",
  REFUNDED: "muted",
};

const METHOD_KEY: Record<string, string> = {
  CASH: "methodCash",
  BANK_TRANSFER: "methodBankTransfer",
  CARD: "methodCard",
  CHEQUE: "methodCheque",
  MOBILE_PAYMENT: "methodMobilePayment",
  INSURANCE: "methodInsurance",
  OTHER: "methodOther",
};

const dec = (v: { toNumber(): number } | number) =>
  typeof v === "number" ? v : Number(v.toNumber());

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  const patientName = locale === "ar" ? invoice.patient.nameAr : invoice.patient.nameEn;
  const fmt = (n: number) =>
    n.toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 2 });

  const breadcrumbs: Crumb[] = [
    { label: t("billing.title"), href: "/billing" },
    { label: invoice.invoiceNo },
  ];

  const canPay = ["ISSUED", "PARTIALLY_PAID"].includes(invoice.status);

  return (
    <div className="space-y-5">
      <PageHeader
        title={invoice.invoiceNo}
        description={formatDateTime(invoice.issuedAt, locale)}
        icon={<FileText />}
        breadcrumbs={breadcrumbs}
        actions={<InvoiceActions invoiceId={invoice.id} status={invoice.status} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>{patientName?.charAt(0) ?? "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{patientName}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{invoice.patient.mrn}</p>
                </div>
              </div>
              <Badge variant={STATUS_COLOR[invoice.status] ?? "outline"}>
                {t(`billing.${STATUS_KEY[invoice.status] ?? "statusIssued"}`)}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-3 text-start">{t("billing.itemDescription")}</th>
                    <th className="py-2 pr-3 text-start">{t("billing.qty")}</th>
                    <th className="py-2 pr-3 text-end">{t("billing.unitPrice")}</th>
                    <th className="py-2 pr-3 text-end">{t("billing.discountAmount")}</th>
                    <th className="py-2 text-end">{t("billing.grandTotal")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2.5 pr-3">
                        {it.description}
                        {it.service ? (
                          <p className="text-xs text-muted-foreground tabular-nums">{it.service.code}</p>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{it.quantity}</td>
                      <td className="py-2.5 pr-3 text-end tabular-nums">{fmt(dec(it.unitPrice))}</td>
                      <td className="py-2.5 pr-3 text-end tabular-nums">−{fmt(dec(it.discount))}</td>
                      <td className="py-2.5 text-end font-medium tabular-nums">{fmt(dec(it.total))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t text-sm">
                  {invoice.discountAmount.toNumber() > 0 ? (
                    <tr>
                      <td colSpan={4} className="py-1.5 pr-3 text-end text-muted-foreground">{t("billing.subtotal")}</td>
                      <td className="py-1.5 text-end tabular-nums">{fmt(dec(invoice.subtotal))}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <td colSpan={4} className="py-1.5 pr-3 text-end text-muted-foreground">{t("billing.discountAmount")}</td>
                    <td className="py-1.5 text-end tabular-nums">−{fmt(dec(invoice.discountAmount))}</td>
                  </tr>
                  {invoice.taxAmount.toNumber() > 0 ? (
                    <tr>
                      <td colSpan={4} className="py-1.5 pr-3 text-end text-muted-foreground">{t("billing.tax")}</td>
                      <td className="py-1.5 text-end tabular-nums">{fmt(dec(invoice.taxAmount))}</td>
                    </tr>
                  ) : null}
                  <tr className="font-semibold">
                    <td colSpan={4} className="py-1.5 pr-3 text-end">{t("billing.grandTotal")}</td>
                    <td className="py-1.5 text-end tabular-nums">{fmt(dec(invoice.total))} YER</td>
                  </tr>
                  <tr className="text-success">
                    <td colSpan={4} className="py-1.5 pr-3 text-end">{t("billing.alreadyPaid")}</td>
                    <td className="py-1.5 text-end tabular-nums">−{fmt(dec(invoice.paidAmount))} YER</td>
                  </tr>
                  <tr className="font-semibold">
                    <td colSpan={4} className="py-1.5 pr-3 text-end">{t("billing.remaining")}</td>
                    <td className="py-1.5 text-end tabular-nums">{fmt(dec(invoice.dueAmount))} YER</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat icon={<Clock3 />} label={t("billing.issuedAt")} value={formatDateTime(invoice.issuedAt, locale)} />
              <MiniStat icon={<Landmark />} label={t("billing.cashier") ?? "Cashier"} value={invoice.cashier ? (locale === "ar" ? invoice.cashier.nameAr : invoice.cashier.nameEn) : "—"} />
              <MiniStat icon={<Undo2 />} label={t("billing.refunds") ?? "Refunds"} value={String(invoice.refunds.length)} />
              <MiniStat icon={<UserRound />} label={t("billing.insurance") ?? "Insurance"} value={invoice.insuranceClaim ? (locale === "ar" ? invoice.insuranceClaim.company.nameAr : invoice.insuranceClaim.company.nameEn) : "—"} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {canPay && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Banknote className="size-4 text-primary" />
                  {t("billing.addPayment")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentForm invoiceId={invoice.id} dueAmount={String(dec(invoice.dueAmount))} locale={locale} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("payments.transactions")}</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">{t("payments.noPayments")}</p>
              ) : (
                <ul className="divide-y">
                  {invoice.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{p.paymentNo}</p>
                        <p>{t(`payments.${METHOD_KEY[p.method] ?? "methodOther"}`)}</p>
                      </div>
                      <div className="text-end">
                        <p className="font-semibold tabular-nums">{fmt(dec(p.amount))} YER</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(p.paidAt, locale)}</p>
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

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/20 px-3 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
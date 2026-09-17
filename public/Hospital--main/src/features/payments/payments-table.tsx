"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Banknote } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type PaymentRow = {
  id: string;
  paymentNo: string;
  invoiceId: string | null;
  invoiceNo: string | null;
  patientId: string | null;
  patientNameAr: string | null;
  patientNameEn: string | null;
  mrn: string | null;
  method: string;
  amount: string;
  currency: string;
  status: string;
  cashierNameAr: string | null;
  cashierNameEn: string | null;
  paidAt: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "info" | "warning" | "success" | "destructive" | "muted" | "outline"> = {
  PENDING: "warning",
  COMPLETED: "success",
  FAILED: "destructive",
  REFUNDED: "info",
  CANCELLED: "muted",
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

export function PaymentsTable({ rows, locale }: { rows: PaymentRow[]; locale: string }) {
  const t = useTranslations("payments");
  const tb = useTranslations("billing");
  const ta = useTranslations("accounting");
  const tc = useTranslations("common");

  const money = (v: string, c: string) =>
    `${Number(v).toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 2 })} ${c}`;

  const columns: ColumnDef<PaymentRow>[] = [
    {
      id: "paymentNo",
      header: t("title"),
      renderRow: (row) => (
        <Link href={`/payments/${row.id}`} className="font-mono text-sm font-medium tabular-nums hover:underline">
          {row.paymentNo}
        </Link>
      ),
      sortValue: (row) => row.paymentNo,
      hideable: false,
    },
    {
      id: "invoiceNo",
      header: tb("invoiceNo"),
      renderRow: (row) =>
        row.invoiceId ? (
          <Link href={`/billing/${row.invoiceId}`} className="font-medium text-primary tabular-nums hover:underline">
            {row.invoiceNo}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (row) => row.invoiceNo ?? "",
    },
    {
      id: "patient",
      header: tc("patient"),
      renderRow: (row) =>
        row.patientId ? (
          <Link href={`/patients/${row.patientId}`} className="block min-w-0">
            <p className="truncate font-medium">{locale === "ar" ? row.patientNameAr : row.patientNameEn}</p>
            <p className="truncate text-xs text-muted-foreground tabular-nums">{row.mrn}</p>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (row) => row.patientNameAr ?? "",
      className: "min-w-40",
    },
    {
      id: "method",
      header: t("method"),
      renderRow: (row) => <Badge variant="outline">{t(METHOD_KEY[row.method] ?? "methodOther")}</Badge>,
      sortValue: (row) => row.method,
    },
    {
      id: "amount",
      header: tc("amount"),
      renderRow: (row) => <span className="tabular-nums whitespace-nowrap">{money(row.amount, row.currency)}</span>,
      sortValue: (row) => Number(row.amount),
      className: "text-end",
      hideable: false,
    },
    {
      id: "status",
      header: tc("status"),
      renderRow: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>{row.status}</Badge>,
      sortValue: (row) => row.status,
    },
    {
      id: "cashier",
      header: tb("cashier"),
      renderRow: (row) => (
        <span className="truncate">{locale === "ar" ? row.cashierNameAr : row.cashierNameEn ?? "—"}</span>
      ),
      sortValue: (row) => row.cashierNameEn ?? "",
    },
    {
      id: "paidAt",
      header: ta("paidAt"),
      renderRow: (row) => (
        <span className="tabular-nums text-xs">{row.paidAt ? new Date(row.paidAt).toLocaleString(locale === "ar" ? "ar-YE" : "en-GB") : "—"}</span>
      ),
      sortValue: (row) => row.paidAt,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${t("title")} / ${tc("search")}`}
      searchValue={(r) => `${r.paymentNo} ${r.invoiceNo ?? ""} ${r.patientNameAr ?? ""} ${r.patientNameEn ?? ""} ${r.mrn ?? ""}`}
      emptyIcon={Banknote}
      emptyTitle={t("noPayments")}
      exportFilename="payments"
    />
  );
}
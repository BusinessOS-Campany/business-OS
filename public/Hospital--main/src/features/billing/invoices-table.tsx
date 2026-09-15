"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { WalletIcon, PlusIcon, ArrowUpRightIcon } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type InvoiceTableRow = {
  id: string;
  invoiceNo: string;
  patientId: string;
  patientNameAr: string;
  patientNameEn: string;
  patientMrn: string;
  issuedAt: string;
  total: string;
  paidAmount: string;
  dueAmount: string;
  currency: string;
  status: string;
} & Record<string, unknown>;

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

export function InvoicesTable({ rows, locale }: { rows: InvoiceTableRow[]; locale: string }) {
  const t = useTranslations("billing");
  const tc = useTranslations("common");

  const money = (v: string) =>
    `${Number(v).toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 2 })} YER`;

  const columns: ColumnDef<InvoiceTableRow>[] = [
    {
      id: "invoiceNo",
      header: t("invoiceNo"),
      renderRow: (row) => (
        <Link href={`/billing/${row.id}`} className="font-mono text-sm font-medium tabular-nums hover:underline">
          {row.invoiceNo}
        </Link>
      ),
      sortValue: (row) => row.invoiceNo,
      hideable: false,
    },
    {
      id: "patient",
      header: tc("name"),
      renderRow: (row) => (
        <Link href={`/patients/${row.patientId}`} className="block min-w-0">
          <p className="truncate font-medium">{locale === "ar" ? row.patientNameAr : row.patientNameEn}</p>
          <p className="truncate text-xs text-muted-foreground tabular-nums">{row.patientMrn}</p>
        </Link>
      ),
      sortValue: (row) => row.patientNameAr,
      className: "min-w-44",
    },
    {
      id: "total",
      header: t("grandTotal"),
      renderRow: (row) => <span className="tabular-nums whitespace-nowrap">{money(row.total)}</span>,
      sortValue: (row) => Number(row.total),
      className: "text-end",
    },
    {
      id: "paid",
      header: t("alreadyPaid"),
      renderRow: (row) => <span className="tabular-nums whitespace-nowrap">{money(row.paidAmount)}</span>,
      sortValue: (row) => Number(row.paidAmount),
      className: "text-end",
      hideable: true,
    },
    {
      id: "due",
      header: t("remaining"),
      renderRow: (row) => (
        <span className={`tabular-nums whitespace-nowrap ${Number(row.dueAmount) > 0 ? "font-medium text-amber-600" : ""}`}>
          {money(row.dueAmount)}
        </span>
      ),
      sortValue: (row) => Number(row.dueAmount),
      className: "text-end",
    },
    {
      id: "status",
      header: tc("status"),
      renderRow: (row) => (
        <Badge variant={STATUS_COLOR[row.status] ?? "outline"}>
          {t(STATUS_KEY[row.status] ?? "statusIssued")}
        </Badge>
      ),
      sortValue: (row) => row.status,
    },
    {
      id: "actions",
      header: "",
      className: "w-12",
      hideable: false,
      renderRow: (row) => (
        <Link
          href={`/billing/${row.id}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={tc("view")}
        >
          <ArrowUpRightIcon className="size-4" />
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${t("invoiceNo")} / ${tc("name")}`}
      searchValue={(row) => `${row.invoiceNo} ${row.patientNameAr} ${row.patientNameEn} ${row.patientMrn}`}
      emptyIcon={WalletIcon}
      emptyTitle={t("noInvoices")}
      emptyHint={t("createFirstInvoice")}
      emptyActionLabel={t("newInvoice")}
      emptyActionHref="/billing/new"
      exportFilename="invoices"
      toolbarActions={
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/billing/new">
            <PlusIcon className="size-3.5" />
            {t("newInvoice")}
          </Link>
        </Button>
      }
    />
  );
}
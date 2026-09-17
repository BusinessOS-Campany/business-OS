"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Undo2 } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type RefundRow = {
  id: string;
  refundNo: string;
  invoiceId: string;
  invoiceNo: string;
  paymentId: string | null;
  paymentNo: string | null;
  amount: string;
  reason: string | null;
  status: string;
  cashierNameAr: string | null;
  cashierNameEn: string | null;
  createdAt: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "info" | "warning" | "success" | "destructive" | "muted" | "outline"> = {
  PENDING: "warning",
  COMPLETED: "success",
  FAILED: "destructive",
  REFUNDED: "info",
  CANCELLED: "muted",
};

export function RefundsTable({ rows, locale }: { rows: RefundRow[]; locale: string }) {
  const t = useTranslations("payments");
  const tb = useTranslations("billing");
  const tc = useTranslations("common");

  const money = (v: string) =>
    `${Number(v).toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 2 })} YER`;

  const columns: ColumnDef<RefundRow>[] = [
    {
      id: "refundNo",
      header: t("refund"),
      renderRow: (row) => <span className="font-mono text-sm font-medium tabular-nums">{row.refundNo}</span>,
      sortValue: (row) => row.refundNo,
      hideable: false,
    },
    {
      id: "invoiceNo",
      header: tb("invoiceNo"),
      renderRow: (row) => (
        <Link href={`/billing/${row.invoiceId}`} className="font-medium text-primary tabular-nums hover:underline">
          {row.invoiceNo}
        </Link>
      ),
      sortValue: (row) => row.invoiceNo,
    },
    {
      id: "paymentNo",
      header: t("title"),
      renderRow: (row) =>
        row.paymentId ? (
          <Link href={`/payments/${row.paymentId}`} className="font-mono text-xs text-muted-foreground hover:underline">
            {row.paymentNo}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (row) => row.paymentNo ?? "",
    },
    {
      id: "amount",
      header: tc("amount"),
      renderRow: (row) => <span className="tabular-nums whitespace-nowrap text-destructive">{money(row.amount)}</span>,
      sortValue: (row) => Number(row.amount),
      className: "text-end",
      hideable: false,
    },
    {
      id: "reason",
      header: t("refundReason"),
      renderRow: (row) => <span className="max-w-[200px] truncate">{row.reason ?? "—"}</span>,
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
    },
    {
      id: "createdAt",
      header: tc("date"),
      renderRow: (row) => (
        <span className="tabular-nums text-xs">{new Date(row.createdAt).toLocaleString(locale === "ar" ? "ar-YE" : "en-GB")}</span>
      ),
      sortValue: (row) => row.createdAt,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${t("refund")} / ${tc("search")}`}
      searchValue={(r) => `${r.refundNo} ${r.invoiceNo} ${r.paymentNo ?? ""} ${r.reason ?? ""}`}
      emptyIcon={Undo2}
      emptyTitle={t("refunds")}
      exportFilename="refunds"
    />
  );
}
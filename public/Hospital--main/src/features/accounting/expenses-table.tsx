"use client";

import { useTranslations } from "next-intl";
import { WalletMinimal } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type ExpenseRow = {
  id: string;
  expenseNo: string;
  categoryId: string;
  categoryAr: string;
  categoryEn: string;
  amount: string;
  method: string;
  paidByAr: string | null;
  paidByEn: string | null;
  paidAt: string;
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

export function ExpensesTable({ rows, locale }: { rows: ExpenseRow[]; locale: string }) {
  const t = useTranslations("accounting");
  const tp = useTranslations("payments");
  const tb = useTranslations("billing");
  const tc = useTranslations("common");

  const money = (v: string) =>
    `${Number(v).toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 2 })} YER`;

  const columns: ColumnDef<ExpenseRow>[] = [
    {
      id: "expenseNo",
      header: t("expenses"),
      renderRow: (row) => <span className="font-mono text-sm font-medium tabular-nums">{row.expenseNo}</span>,
      sortValue: (row) => row.expenseNo,
      hideable: false,
    },
    {
      id: "category",
      header: t("expenseCategory"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.categoryAr : row.categoryEn}</span>,
      sortValue: (row) => row.categoryAr,
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
      id: "method",
      header: tp("method"),
      renderRow: (row) => <Badge variant="outline">{tp(METHOD_KEY[row.method] ?? "methodOther")}</Badge>,
      sortValue: (row) => row.method,
    },
    {
      id: "paidBy",
      header: tb("cashier"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.paidByAr : row.paidByEn ?? "—"}</span>,
      sortValue: (row) => row.paidByEn ?? "",
    },
    {
      id: "paidAt",
      header: t("paidAt"),
      renderRow: (row) => (
        <span className="tabular-nums text-xs">{new Date(row.paidAt).toLocaleDateString(locale === "ar" ? "ar-YE" : "en-GB")}</span>
      ),
      sortValue: (row) => row.paidAt,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tc("search")} ${t("expenses")}`}
      searchValue={(r) => `${r.expenseNo} ${r.categoryAr} ${r.categoryEn} ${r.paidByAr ?? ""} ${r.paidByEn ?? ""}`}
      emptyIcon={WalletMinimal}
      emptyTitle={t("expenses")}
      exportFilename="expenses"
    />
  );
}
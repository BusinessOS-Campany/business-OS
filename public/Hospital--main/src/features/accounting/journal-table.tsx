"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";

export type JournalRow = {
  id: string;
  entryNo: string;
  date: string;
  description: string | null;
  reference: string | null;
  totalDebit: string;
  totalCredit: string;
  linesCount: number;
};

export function JournalTable({ rows, locale }: { rows: JournalRow[]; locale: string }) {
  const t = useTranslations("accounting");
  const tc = useTranslations("common");

  const money = (v: string) =>
    `${Number(v).toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 2 })} YER`;

  const columns: ColumnDef<JournalRow>[] = [
    {
      id: "entryNo",
      header: t("journal"),
      renderRow: (row) => (
        <Link href={`/accounting/journal/${row.id}`} className="font-mono text-sm font-medium tabular-nums hover:underline">
          {row.entryNo}
        </Link>
      ),
      sortValue: (row) => row.entryNo,
      hideable: false,
    },
    {
      id: "date",
      header: tc("date"),
      renderRow: (row) => <span className="tabular-nums text-xs">{new Date(row.date).toLocaleDateString(locale === "ar" ? "ar-YE" : "en-GB")}</span>,
      sortValue: (row) => row.date,
    },
    {
      id: "description",
      header: tc("description"),
      renderRow: (row) => <span className="max-w-[220px] truncate">{row.description ?? "—"}</span>,
      sortValue: (row) => row.description ?? "",
    },
    {
      id: "debit",
      header: t("debit"),
      renderRow: (row) => <span className="tabular-nums whitespace-nowrap">{money(row.totalDebit)}</span>,
      sortValue: (row) => Number(row.totalDebit),
      className: "text-end",
      hideable: false,
    },
    {
      id: "credit",
      header: t("credit"),
      renderRow: (row) => <span className="tabular-nums whitespace-nowrap">{money(row.totalCredit)}</span>,
      sortValue: (row) => Number(row.totalCredit),
      className: "text-end",
      hideable: false,
    },
    {
      id: "lines",
      header: tc("total"),
      renderRow: (row) => <span className="tabular-nums text-muted-foreground">{String(row.linesCount)}</span>,
      sortValue: (row) => row.linesCount,
      className: "text-end",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tc("search")} ${t("journal")}`}
      searchValue={(r) => `${r.entryNo} ${r.description ?? ""} ${r.reference ?? ""}`}
      emptyIcon={BookOpen}
      emptyTitle={t("noEntries")}
      exportFilename="journal-entries"
    />
  );
}
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";

export type LineRow = {
  id: string;
  employeeId: string;
  employeeNameAr: string;
  employeeNameEn: string;
  employeeNo: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  overtime: number;
  bonuses: number;
  advances: number;
  loans: number;
  net: number;
  currency: string;
};

function money(n: number, currency: string) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<LineRow>[] {
  const moneyCol = (id: keyof LineRow, header: string): ColumnDef<LineRow> => ({
    id,
    header,
    renderRow: (row) => <span className="tabular-nums">{money(Number(row[id]), row.currency)}</span>,
    sortValue: (row) => Number(row[id]),
  });

  return [
    {
      id: "employee",
      header: t("employees.title"),
      renderRow: (row) => (
        <Link href={`/employees/${row.employeeId}`} className="font-medium hover:underline">
          {locale === "ar" ? row.employeeNameAr : row.employeeNameEn}
          <span className="ml-1 text-xs text-muted-foreground">({row.employeeNo})</span>
        </Link>
      ),
      sortValue: (row) => (locale === "ar" ? row.employeeNameAr : row.employeeNameEn),
    },
    moneyCol("baseSalary", t("employees.baseSalary")),
    moneyCol("allowances", t("payroll.allowances")),
    moneyCol("overtime", t("payroll.overtime")),
    moneyCol("bonuses", t("payroll.bonuses")),
    moneyCol("deductions", t("payroll.deductions")),
    moneyCol("advances", t("payroll.advances")),
    moneyCol("loans", t("payroll.loans")),
    {
      id: "net",
      header: t("payroll.net"),
      renderRow: (row) => <span className="font-semibold tabular-nums">{money(row.net, row.currency)}</span>,
      sortValue: (row) => row.net,
    },
  ];
}

export function LinesTable({ rows, locale }: { rows: LineRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("employees.title")}`}
      searchValue={(r) => `${r.employeeNameAr} ${r.employeeNameEn} ${r.employeeNo}`}
      emptyIcon={Wallet}
      emptyTitle={tr("common.noResults")}
      showColumnsControl={false}
      exportFilename="payroll-lines"
    />
  );
}

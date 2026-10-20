"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type PeriodRow = {
  id: string;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  status: string;
  runsCount: number;
};

const STATUS_VARIANT: Record<string, "secondary" | "info" | "success"> = {
  DRAFT: "secondary",
  APPROVED: "info",
  PAID: "success",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "payroll.statusDraft",
  APPROVED: "payroll.statusApproved",
  PAID: "payroll.statusPaid",
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<PeriodRow>[] {
  return [
    {
      id: "name",
      header: t("common.nameEn"),
      renderRow: (row) => (
        <Link href={`/payroll/${row.id}`} className="font-medium hover:underline">
          {locale === "ar" ? row.nameAr : row.nameEn}
        </Link>
      ),
      sortValue: (row) => (locale === "ar" ? row.nameAr : row.nameEn),
    },
    {
      id: "startDate",
      header: t("hr.startDate"),
      renderRow: (row) => <span className="tabular-nums text-xs">{row.startDate}</span>,
    },
    {
      id: "endDate",
      header: t("hr.endDate"),
      renderRow: (row) => <span className="tabular-nums text-xs">{row.endDate}</span>,
    },
    {
      id: "runs",
      header: t("common.total"),
      renderRow: (row) => <span className="tabular-nums">{row.runsCount}</span>,
      sortValue: (row) => row.runsCount,
    },
    {
      id: "status",
      header: t("common.status"),
      renderRow: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>
          {t(STATUS_LABEL[row.status] ?? row.status)}
        </Badge>
      ),
    },
  ];
}

export function PeriodsTable({ rows, locale }: { rows: PeriodRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("payroll.periods")}`}
      searchValue={(r) => `${r.nameAr} ${r.nameEn}`}
      emptyIcon={Wallet}
      emptyTitle={tr("payroll.noPeriods")}
      showColumnsControl={false}
    />
  );
}

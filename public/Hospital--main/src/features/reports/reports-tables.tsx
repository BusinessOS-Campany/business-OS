"use client";

import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";

export type DepartmentRow = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  encounters: number;
};

export function DepartmentTable({ rows, locale }: { rows: DepartmentRow[]; locale: string }) {
  const t = useTranslations();
  const columns: ColumnDef<DepartmentRow>[] = [
    {
      id: "code",
      header: t("common.name"),
      renderRow: (row) => <span className="font-mono text-xs text-muted-foreground">{row.code}</span>,
    },
    {
      id: "name",
      header: t("settings.departments"),
      renderRow: (row) => (locale === "ar" ? row.nameAr : row.nameEn),
      sortValue: (row) => (locale === "ar" ? row.nameAr : row.nameEn),
    },
    {
      id: "encounters",
      header: t("reports.patientStatistics"),
      renderRow: (row) => <span className="tabular-nums">{row.encounters}</span>,
      sortValue: (row) => row.encounters,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${t("common.search")} ${t("settings.departments")}`}
      searchValue={(r) => `${r.code} ${r.nameAr} ${r.nameEn}`}
      emptyIcon={Building2}
      emptyTitle={t("reports.noData")}
      showColumnsControl={false}
    />
  );
}

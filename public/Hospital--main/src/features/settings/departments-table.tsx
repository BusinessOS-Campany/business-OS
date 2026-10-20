"use client";

import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type DepartmentRow = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: string;
  branchNameAr: string;
  branchNameEn: string;
  isActive: boolean;
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<DepartmentRow>[] {
  return [
    {
      id: "code",
      header: t("settings.deptCode"),
      renderRow: (row) => <span className="font-mono text-xs text-muted-foreground">{row.code}</span>,
      sortValue: (row) => row.code,
    },
    {
      id: "name",
      header: t("settings.departments"),
      renderRow: (row) => (
        <span className="font-medium">{locale === "ar" ? row.nameAr : row.nameEn}</span>
      ),
      sortValue: (row) => (locale === "ar" ? row.nameAr : row.nameEn),
    },
    {
      id: "type",
      header: t("settings.deptType"),
      renderRow: (row) => <Badge variant="secondary">{row.type}</Badge>,
    },
    {
      id: "branch",
      header: t("settings.branchesSettings"),
      renderRow: (row) => (
        <span className="text-sm">{locale === "ar" ? row.branchNameAr : row.branchNameEn}</span>
      ),
    },
    {
      id: "status",
      header: t("common.status"),
      renderRow: (row) => (
        <Badge variant={row.isActive ? "success" : "muted"}>
          {row.isActive ? t("admin.isActive") : t("assets.statusInactive")}
        </Badge>
      ),
    },
  ];
}

export function DepartmentsTable({ rows, locale }: { rows: DepartmentRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("settings.departments")}`}
      searchValue={(r) => `${r.code} ${r.nameAr} ${r.nameEn}`}
      emptyIcon={Building2}
      emptyTitle={tr("common.noResults")}
      showColumnsControl={false}
    />
  );
}

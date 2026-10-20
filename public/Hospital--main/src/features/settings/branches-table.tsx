"use client";

import { useTranslations } from "next-intl";
import { GitBranch } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type BranchRow = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  email: string;
  isActive: boolean;
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<BranchRow>[] {
  return [
    {
      id: "code",
      header: t("settings.deptCode"),
      renderRow: (row) => <span className="font-mono text-xs text-muted-foreground">{row.code}</span>,
      sortValue: (row) => row.code,
    },
    {
      id: "name",
      header: t("settings.branchesSettings"),
      renderRow: (row) => (
        <span className="font-medium">{locale === "ar" ? row.nameAr : row.nameEn}</span>
      ),
      sortValue: (row) => (locale === "ar" ? row.nameAr : row.nameEn),
    },
    {
      id: "phone",
      header: t("common.phone"),
      renderRow: (row) => <span className="text-sm tabular-nums">{row.phone || "—"}</span>,
    },
    {
      id: "email",
      header: t("common.email"),
      renderRow: (row) => <span className="text-sm">{row.email || "—"}</span>,
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

export function BranchesTable({ rows, locale }: { rows: BranchRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("settings.branchesSettings")}`}
      searchValue={(r) => `${r.code} ${r.nameAr} ${r.nameEn}`}
      emptyIcon={GitBranch}
      emptyTitle={tr("common.noResults")}
      showColumnsControl={false}
    />
  );
}

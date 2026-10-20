"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type RoleRow = {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  usersCount: number;
  permissionsCount: number;
  isSystem: boolean;
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<RoleRow>[] {
  return [
    {
      id: "name",
      header: t("common.name"),
      renderRow: (row) => (
        <Link href={`/admin/roles/${row.id}`} className="font-medium hover:underline">
          {locale === "ar" ? row.nameAr : row.nameEn}
        </Link>
      ),
      sortValue: (row) => (locale === "ar" ? row.nameAr : row.nameEn),
    },
    {
      id: "key",
      header: t("admin.role"),
      renderRow: (row) => <span className="font-mono text-xs text-muted-foreground">{row.key}</span>,
    },
    {
      id: "users",
      header: t("admin.users"),
      renderRow: (row) => <span className="tabular-nums">{row.usersCount}</span>,
      sortValue: (row) => row.usersCount,
    },
    {
      id: "permissions",
      header: t("admin.permissions"),
      renderRow: (row) => <span className="tabular-nums">{row.permissionsCount}</span>,
      sortValue: (row) => row.permissionsCount,
    },
    {
      id: "system",
      header: t("common.status"),
      renderRow: (row) =>
        row.isSystem ? <Badge variant="secondary">{t("settings.general")}</Badge> : null,
    },
  ];
}

export function RolesTable({ rows, locale }: { rows: RoleRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("admin.roles")}`}
      searchValue={(r) => `${r.nameAr} ${r.nameEn} ${r.key}`}
      emptyIcon={ShieldCheck}
      emptyTitle={tr("admin.noRoles")}
      showColumnsControl={false}
    />
  );
}

"use client";

import { useTranslations } from "next-intl";
import { BookOpenText } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type AccountRow = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  type: string;
  isActive: boolean;
  parentCode: string | null;
  parentNameAr: string | null;
  parentNameEn: string | null;
  childrenCount: number;
};

const TYPE_VARIANT: Record<string, "default" | "secondary" | "info" | "warning" | "success" | "destructive" | "muted" | "outline"> = {
  ASSET: "default",
  LIABILITY: "warning",
  EQUITY: "secondary",
  REVENUE: "success",
  EXPENSE: "destructive",
};

export function AccountsTable({ rows, locale }: { rows: AccountRow[]; locale: string }) {
  const t = useTranslations("accounting");
  const tc = useTranslations("common");

  const columns: ColumnDef<AccountRow>[] = [
    {
      id: "code",
      header: t("account"),
      renderRow: (row) => <span className="font-mono text-sm font-medium tabular-nums">{row.code}</span>,
      sortValue: (row) => row.code,
      hideable: false,
    },
    {
      id: "name",
      header: tc("name"),
      renderRow: (row) => (
        <span className="truncate">{locale === "ar" ? row.nameAr : row.nameEn ?? row.nameAr}</span>
      ),
      sortValue: (row) => row.nameAr,
      className: "min-w-44",
    },
    {
      id: "type",
      header: "Type",
      renderRow: (row) => <Badge variant={TYPE_VARIANT[row.type] ?? "outline"}>{row.type}</Badge>,
      sortValue: (row) => row.type,
    },
    {
      id: "parent",
      header: tc("optional"),
      renderRow: (row) => (
        <span className="truncate">
          {row.parentCode ? (
            <>
              {row.parentCode} · {locale === "ar" ? row.parentNameAr : row.parentNameEn ?? row.parentNameAr}
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
      sortValue: (row) => row.parentCode ?? "",
    },
    {
      id: "children",
      header: tc("total"),
      renderRow: (row) => <span className="tabular-nums text-muted-foreground">{String(row.childrenCount)}</span>,
      sortValue: (row) => row.childrenCount,
      className: "text-end",
    },
    {
      id: "active",
      header: tc("status"),
      renderRow: (row) => (
        <Badge variant={row.isActive ? "success" : "muted"}>
          {row.isActive ? tc("activate") : tc("deactivate")}
        </Badge>
      ),
      sortValue: (row) => (row.isActive ? "1" : "0"),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tc("search")} ${t("chartOfAccounts")}`}
      searchValue={(r) => `${r.code} ${r.nameAr} ${r.nameEn ?? ""} ${r.parentCode ?? ""} ${r.parentNameAr ?? ""}`}
      emptyIcon={BookOpenText}
      emptyTitle={t("chartOfAccounts")}
      exportFilename="accounts"
    />
  );
}
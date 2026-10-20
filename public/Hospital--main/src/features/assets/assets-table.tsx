"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Boxes } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { AssetStatusActions } from "./asset-status-actions";

export type AssetRow = {
  id: string;
  assetNo: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  location: string | null;
  serialNo: string | null;
  departmentNameAr: string | null;
  departmentNameEn: string | null;
  custodianNameAr: string | null;
  custodianNameEn: string | null;
  cost: number | null;
  status: string;
};

const STATUS_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "muted" | "destructive"> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  UNDER_MAINTENANCE: "warning",
  RETIRED: "muted",
  LOST: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "assets.statusActive",
  INACTIVE: "assets.statusInactive",
  UNDER_MAINTENANCE: "assets.statusUnderMaintenance",
  RETIRED: "assets.statusRetired",
  LOST: "assets.statusLost",
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<AssetRow>[] {
  return [
    {
      id: "assetNo",
      header: t("assets.assetNo"),
      renderRow: (row) => (
        <Link href={`/assets/${row.id}`} className="font-medium hover:underline">{row.assetNo}</Link>
      ),
      sortValue: (row) => row.assetNo,
    },
    {
      id: "name",
      header: t("common.name"),
      renderRow: (row) => (
        <span className="max-w-[200px] truncate">{locale === "ar" ? row.nameAr : row.nameEn ?? row.nameAr}</span>
      ),
    },
    {
      id: "category",
      header: t("assets.category"),
      renderRow: (row) => <span className="truncate">{row.category}</span>,
    },
    {
      id: "location",
      header: t("assets.location"),
      renderRow: (row) => <span className="truncate">{row.location ?? "—"}</span>,
    },
    {
      id: "custodian",
      header: t("assets.custodian"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.custodianNameAr : row.custodianNameEn ?? "—"}</span>,
    },
    {
      id: "cost",
      header: t("assets.cost"),
      renderRow: (row) => (
        <span className="tabular-nums text-xs">{row.cost != null ? Number(row.cost).toLocaleString() : "—"}</span>
      ),
      sortValue: (row) => row.cost ?? 0,
    },
    {
      id: "status",
      header: t("common.status"),
      renderRow: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>{t(STATUS_LABEL[row.status] ?? row.status)}</Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      renderRow: (row) => <AssetStatusActions assetId={row.id} status={row.status} />,
    },
  ];
}

export function AssetsTable({ rows, locale }: { rows: AssetRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("assets.title")}`}
      searchValue={(r) =>
        `${r.assetNo} ${r.nameAr} ${r.nameEn ?? ""} ${r.category} ${r.location ?? ""} ${r.serialNo ?? ""} ${r.custodianNameAr ?? ""} ${r.custodianNameEn ?? ""}`
      }
      emptyIcon={Boxes}
      emptyTitle={tr("assets.noAssets")}
      showColumnsControl={false}
    />
  );
}
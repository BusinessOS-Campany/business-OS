"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wrench } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { MaintenanceStatusActions } from "./maintenance-status-actions";

export type MaintenanceRow = {
  id: string;
  requestNo: string;
  assetNo: string;
  assetNameAr: string;
  assetNameEn: string;
  type: string;
  status: string;
  technicianNameAr: string | null;
  technicianNameEn: string | null;
  scheduledAt: string | null;
  cost: number | null;
};

const STATUS_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "muted" | "destructive"> = {
  REQUESTED: "warning",
  SCHEDULED: "info",
  IN_PROGRESS: "destructive",
  COMPLETED: "success",
  CANCELLED: "muted",
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "maintenance.statusRequested",
  SCHEDULED: "maintenance.statusScheduled",
  IN_PROGRESS: "maintenance.statusInProgress",
  COMPLETED: "maintenance.statusCompleted",
  CANCELLED: "maintenance.statusCancelled",
};

const TYPE_LABEL: Record<string, string> = {
  PREVENTIVE: "maintenance.typePreventive",
  CORRECTIVE: "maintenance.typeCorrective",
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<MaintenanceRow>[] {
  return [
    {
      id: "requestNo",
      header: t("maintenance.requests"),
      renderRow: (row) => (
        <Link href={`/maintenance/${row.id}`} className="font-medium hover:underline">{row.requestNo}</Link>
      ),
      sortValue: (row) => row.requestNo,
    },
    {
      id: "asset",
      header: t("assets.title"),
      renderRow: (row) => (
        <span className="max-w-[200px] truncate">
          {row.assetNo} — {locale === "ar" ? row.assetNameAr : row.assetNameEn}
        </span>
      ),
    },
    {
      id: "type",
      header: t("appointments.type"),
      renderRow: (row) => <span className="truncate">{t(TYPE_LABEL[row.type] ?? row.type)}</span>,
    },
    {
      id: "technician",
      header: t("employees.title"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.technicianNameAr : row.technicianNameEn ?? "—"}</span>,
    },
    {
      id: "scheduledAt",
      header: t("surgery.scheduledAt"),
      renderRow: (row) => <span className="tabular-nums text-xs">{row.scheduledAt ? new Date(row.scheduledAt).toLocaleString() : "—"}</span>,
      sortValue: (row) => row.scheduledAt ?? "",
    },
    {
      id: "cost",
      header: t("maintenance.cost"),
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
      renderRow: (row) => <MaintenanceStatusActions requestId={row.id} status={row.status} />,
    },
  ];
}

export function MaintenanceTable({ rows, locale }: { rows: MaintenanceRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("maintenance.title")}`}
      searchValue={(r) =>
        `${r.requestNo} ${r.assetNo} ${r.assetNameAr} ${r.assetNameEn} ${r.technicianNameAr ?? ""} ${r.technicianNameEn ?? ""}`
      }
      emptyIcon={Wrench}
      emptyTitle={tr("maintenance.noRequests")}
      showColumnsControl={false}
    />
  );
}
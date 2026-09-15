"use client";

import { useTranslations } from "next-intl";
import { Ambulance } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type AmbulanceRow = {
  id: string;
  code: string;
  plateNo: string;
  model: string | null;
  capacity: number;
  status: string;
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "info" | "destructive" | "secondary" | "muted"> = {
  AVAILABLE: "success",
  DISPATCHED: "info",
  EN_ROUTE: "info",
  ARRIVED: "info",
  TRANSPORTING: "warning",
  MAINTENANCE: "secondary",
  OUT_OF_SERVICE: "muted",
};

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "ambulance.statusAvailable",
  DISPATCHED: "ambulance.statusDispatched",
  EN_ROUTE: "ambulance.statusEnRoute",
  ARRIVED: "ambulance.statusArrived",
  TRANSPORTING: "ambulance.statusTransporting",
  MAINTENANCE: "ambulance.statusMaintenance",
  OUT_OF_SERVICE: "ambulance.statusOutOfService",
};

function buildColumns(t: (k: string) => string): ColumnDef<AmbulanceRow>[] {
  return [
    {
      id: "code",
      header: t("ambulance.code"),
      renderRow: (row) => <span className="font-medium">{row.code}</span>,
      sortValue: (row) => row.code,
    },
    {
      id: "plateNo",
      header: t("ambulance.plateNo"),
      renderRow: (row) => <span>{row.plateNo}</span>,
      sortValue: (row) => row.plateNo,
    },
    {
      id: "model",
      header: t("ambulance.model"),
      renderRow: (row) => <span>{row.model ?? "—"}</span>,
    },
    {
      id: "capacity",
      header: t("ambulance.capacity"),
      renderRow: (row) => <span className="tabular-nums">{row.capacity}</span>,
      sortValue: (row) => row.capacity,
    },
    {
      id: "status",
      header: t("common.status"),
      renderRow: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>{t(STATUS_LABEL[row.status] ?? row.status)}</Badge>
      ),
    },
  ];
}

export function AmbulanceTable({ rows }: { rows: AmbulanceRow[] }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("ambulance.vehicles")}`}
      searchValue={(r) => `${r.code} ${r.plateNo} ${r.model ?? ""}`}
      emptyIcon={Ambulance}
      emptyTitle={tr("ambulance.vehicles")}
      showColumnsControl={false}
    />
  );
}
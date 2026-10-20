"use client";

import { useTranslations } from "next-intl";
import { Droplets } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { BloodUnitStatusActions } from "./blood-unit-status-actions";

export type BloodUnitRow = {
  id: string;
  unitNo: string;
  bloodGroup: string;
  volume: number;
  expiryDate: string | null;
  tested: boolean;
  status: string;
  donorName: string | null;
};

const STATUS_VARIANT: Record<string, "warning" | "success" | "info" | "default" | "muted" | "destructive" | "outline"> = {
  QUARANTINED: "warning",
  AVAILABLE: "success",
  RESERVED: "info",
  CROSSMATCHED: "info",
  ISSUED: "default",
  EXPIRED: "muted",
  WASTED: "destructive",
  RETURNED: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  QUARANTINED: "bloodbank.statusQuarantined",
  AVAILABLE: "bloodbank.statusAvailable",
  RESERVED: "bloodbank.statusReserved",
  CROSSMATCHED: "bloodbank.statusCrossmatched",
  ISSUED: "bloodbank.statusIssued",
  EXPIRED: "bloodbank.statusExpired",
  WASTED: "bloodbank.statusWasted",
  RETURNED: "bloodbank.statusReturned",
};

const BLOOD_VARIANT: Record<string, string> = {
  A_POS: "destructive",
  A_NEG: "warning",
  B_POS: "info",
  B_NEG: "secondary",
  AB_POS: "outline",
  AB_NEG: "default",
  O_POS: "success",
  O_NEG: "warning",
  UNKNOWN: "muted",
};

function buildColumns(t: (k: string) => string): ColumnDef<BloodUnitRow>[] {
  return [
    {
      id: "unitNo",
      header: t("bloodbank.unitNo"),
      renderRow: (row) => <span className="font-medium">{row.unitNo}</span>,
      sortValue: (row) => row.unitNo,
    },
    {
      id: "bloodGroup",
      header: t("bloodbank.bloodGroup"),
      renderRow: (row) => <Badge variant={(BLOOD_VARIANT[row.bloodGroup] ?? "outline") as never}>{row.bloodGroup.replace("_", " ")}</Badge>,
    },
    {
      id: "donor",
      header: t("bloodbank.donors"),
      renderRow: (row) => <span className="truncate">{row.donorName ?? "—"}</span>,
    },
    {
      id: "volume",
      header: t("bloodbank.volume"),
      renderRow: (row) => <span className="tabular-nums">{row.volume} ml</span>,
    },
    {
      id: "expiry",
      header: t("bloodbank.expiry"),
      renderRow: (row) => <span className="text-xs tabular-nums">{row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : "—"}</span>,
      sortValue: (row) => row.expiryDate ?? "",
    },
    {
      id: "tested",
      header: t("bloodbank.screened"),
      renderRow: (row) => (
        <Badge variant={row.tested ? "success" : "muted"}>{row.tested ? "✔" : "—"}</Badge>
      ),
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
      renderRow: (row) => (
        <BloodUnitStatusActions unitId={row.id} status={row.status} />
      ),
    },
  ];
}

export function BloodUnitsTable({ rows }: { rows: BloodUnitRow[] }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("bloodbank.units")}`}
      searchValue={(r) => `${r.unitNo} ${r.bloodGroup} ${r.donorName ?? ""}`}
      emptyIcon={Droplets}
      emptyTitle={tr("bloodbank.units")}
      showColumnsControl={false}
    />
  );
}
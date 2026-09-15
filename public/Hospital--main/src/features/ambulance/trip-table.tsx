"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Truck } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { TripStatusActions } from "./trip-status-actions";

export type TripRow = {
  id: string;
  tripNo: string;
  ambulanceCode: string;
  driverNameAr: string | null;
  driverNameEn: string | null;
  patientName: string | null;
  pickup: string;
  destination: string | null;
  status: string;
  dispatchedAt: string | null;
};

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "muted" | "destructive"> = {
  DISPATCHED: "warning",
  EN_ROUTE: "info",
  ARRIVED: "info",
  TRANSPORTING: "info",
  COMPLETED: "success",
  CANCELLED: "muted",
};

const STATUS_LABEL: Record<string, string> = {
  DISPATCHED: "ambulance.tripDispatched",
  EN_ROUTE: "ambulance.tripEnRoute",
  ARRIVED: "ambulance.tripArrived",
  TRANSPORTING: "ambulance.tripTransporting",
  COMPLETED: "ambulance.tripCompleted",
  CANCELLED: "ambulance.tripCancelled",
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<TripRow>[] {
  return [
    {
      id: "tripNo",
      header: t("ambulance.trips"),
      renderRow: (row) => (
        <Link href={`/ambulance/trips/${row.id}`} className="font-medium hover:underline">{row.tripNo}</Link>
      ),
      sortValue: (row) => row.tripNo,
    },
    {
      id: "ambulance",
      header: t("ambulance.ambulanceInfo"),
      renderRow: (row) => <span className="font-medium">{row.ambulanceCode}</span>,
    },
    {
      id: "driver",
      header: t("ambulance.driver"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.driverNameAr : row.driverNameEn ?? "—"}</span>,
    },
    {
      id: "patient",
      header: t("common.patient"),
      renderRow: (row) => <span className="truncate">{row.patientName ?? "—"}</span>,
    },
    {
      id: "pickup",
      header: t("ambulance.pickup"),
      renderRow: (row) => <span className="max-w-[180px] truncate">{row.pickup}</span>,
    },
    {
      id: "dispatchedAt",
      header: t("common.dateShort"),
      renderRow: (row) => <span className="tabular-nums text-xs">{row.dispatchedAt ? new Date(row.dispatchedAt).toLocaleDateString() : "—"}</span>,
      sortValue: (row) => row.dispatchedAt ?? "",
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
        row.status === "COMPLETED" || row.status === "CANCELLED" ? null : (
          <TripStatusActions tripId={row.id} status={row.status} />
        )
      ),
    },
  ];
}

export function TripTable({ rows, locale }: { rows: TripRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("ambulance.trips")}`}
      searchValue={(r) => `${r.tripNo} ${r.patientName ?? ""} ${r.pickup} ${r.ambulanceCode}`}
      emptyIcon={Truck}
      emptyTitle={tr("ambulance.trips")}
      showColumnsControl={false}
    />
  );
}
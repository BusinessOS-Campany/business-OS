"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Scissors } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { SurgeryStatusActions } from "./surgery-status-actions";

export type SurgeryRow = {
  id: string;
  surgeryNo: string;
  patientNameAr: string;
  patientNameEn: string;
  mrn: string;
  procedureNameAr: string;
  procedureNameEn: string | null;
  surgeonNameAr: string | null;
  surgeonNameEn: string | null;
  roomNameAr: string | null;
  roomNameEn: string | null;
  status: string;
  scheduledAt: string | null;
};

const STATUS_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "muted" | "destructive"> = {
  SCHEDULED: "info",
  PRE_OP: "warning",
  IN_PROGRESS: "destructive",
  COMPLETED: "success",
  CANCELLED: "muted",
  POST_OP: "default",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "surgery.statusScheduled",
  PRE_OP: "surgery.statusPreOp",
  IN_PROGRESS: "surgery.statusInProgress",
  COMPLETED: "surgery.statusCompleted",
  CANCELLED: "surgery.statusCancelled",
  POST_OP: "surgery.statusPostOp",
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<SurgeryRow>[] {
  return [
    {
      id: "surgeryNo",
      header: t("surgery.surgeryNo"),
      renderRow: (row) => (
        <Link href={`/surgery/${row.id}`} className="font-medium hover:underline">{row.surgeryNo}</Link>
      ),
      sortValue: (row) => row.surgeryNo,
    },
    {
      id: "patient",
      header: t("common.patient"),
      renderRow: (row) => (
        <span className="truncate">
          {locale === "ar" ? row.patientNameAr : row.patientNameEn}
          <span className="ml-1 text-muted-foreground text-xs">({row.mrn})</span>
        </span>
      ),
    },
    {
      id: "procedure",
      header: t("surgery.procedureName"),
      renderRow: (row) => <span className="max-w-[180px] truncate">{locale === "ar" ? row.procedureNameAr : row.procedureNameEn ?? row.procedureNameAr}</span>,
    },
    {
      id: "surgeon",
      header: t("surgery.surgeon"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.surgeonNameAr : row.surgeonNameEn ?? "—"}</span>,
    },
    {
      id: "room",
      header: t("surgery.operatingRooms"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.roomNameAr : row.roomNameEn ?? "—"}</span>,
    },
    {
      id: "scheduledAt",
      header: t("surgery.scheduledAt"),
      renderRow: (row) => <span className="tabular-nums text-xs">{row.scheduledAt ? new Date(row.scheduledAt).toLocaleString() : "—"}</span>,
      sortValue: (row) => row.scheduledAt ?? "",
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
      renderRow: (row) => (row.status === "CANCELLED" ? null : <SurgeryStatusActions surgeryId={row.id} status={row.status} />),
    },
  ];
}

export function SurgeryTable({ rows, locale }: { rows: SurgeryRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("surgery.title")}`}
      searchValue={(r) => `${r.surgeryNo} ${r.patientNameAr} ${r.patientNameEn} ${r.mrn} ${r.procedureNameAr} ${r.procedureNameEn ?? ""}`}
      emptyIcon={Scissors}
      emptyTitle={tr("surgery.title")}
      showColumnsControl={false}
    />
  );
}
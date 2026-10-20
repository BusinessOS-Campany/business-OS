"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ScanLine } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { RadOrderStatusActions } from "./rad-order-status-actions";

export type RadOrderRow = {
  id: string;
  orderNo: string;
  patientNameAr: string;
  patientNameEn: string;
  mrn: string;
  doctorNameAr: string | null;
  doctorNameEn: string | null;
  modality: string;
  bodyPart: string | null;
  status: string;
  hasReport: boolean;
  createdAt: string;
};

const STATUS_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "destructive"> = {
  ORDERED: "info",
  SCHEDULED: "secondary",
  PERFORMED: "warning",
  REPORTED: "success",
  REVIEWED: "default",
  CANCELLED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  ORDERED: "radiology.statusOrdered",
  SCHEDULED: "radiology.statusScheduled",
  PERFORMED: "radiology.statusPerformed",
  REPORTED: "radiology.statusReported",
  REVIEWED: "radiology.statusReviewed",
  CANCELLED: "radiology.statusCancelled",
};

const MODALITY_LABEL: Record<string, string> = {
  XRAY: "radiology.modalityXRAY",
  CT: "radiology.modalityCT",
  MRI: "radiology.modalityMRI",
  ULTRASOUND: "radiology.modalityULTRASOUND",
  MAMMOGRAPHY: "radiology.modalityMAMMOGRAPHY",
  FLUOROSCOPY: "radiology.modalityFLUOROSCOPY",
  PET: "radiology.modalityPET",
  OTHER: "radiology.modalityOTHER",
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<RadOrderRow>[] {
  return [
    {
      id: "orderNo",
      header: t("common.orderNo"),
      renderRow: (row) => (
        <Link href={`/radiology/orders/${row.id}`} className="font-medium hover:underline">
          {row.orderNo}
        </Link>
      ),
      sortValue: (row) => row.orderNo,
      exportValue: (row) => row.orderNo,
    },
    {
      id: "patient",
      header: t("common.patient"),
      renderRow: (row) => (
        <span className="truncate">
          {locale === "ar" ? row.patientNameAr : row.patientNameEn}
          <span className="ml-1 text-muted-foreground">({row.mrn})</span>
        </span>
      ),
      sortValue: (row) => (locale === "ar" ? row.patientNameAr : row.patientNameEn),
      exportValue: (row) => `${locale === "ar" ? row.patientNameAr : row.patientNameEn} (${row.mrn})`,
    },
    {
      id: "modality",
      header: t("radiology.modality"),
      renderRow: (row) => <Badge variant="outline">{t(MODALITY_LABEL[row.modality] ?? row.modality)}</Badge>,
      exportValue: (row) => row.modality,
    },
    {
      id: "bodyPart",
      header: t("radiology.bodyPart"),
      renderRow: (row) => <span className="truncate">{row.bodyPart ?? "—"}</span>,
      exportValue: (row) => row.bodyPart ?? "",
    },
    {
      id: "status",
      header: t("common.status"),
      renderRow: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>
          {t(STATUS_LABEL[row.status] ?? row.status)}
        </Badge>
      ),
      exportValue: (row) => row.status,
    },
    {
      id: "actions",
      header: "",
      renderRow: (row) => (row.status === "REVIEWED" || row.status === "CANCELLED" ? null : <RadOrderStatusActions orderId={row.id} status={row.status} />),
    },
  ];
}

export function RadOrdersTable({ rows, locale }: { rows: RadOrderRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("radiology.orders")}`}
      searchValue={(r) => `${r.orderNo} ${r.patientNameAr} ${r.patientNameEn} ${r.mrn}`}
      emptyIcon={ScanLine}
      emptyTitle={tr("radiology.noOrders")}
      showColumnsControl={false}
    />
  );
}
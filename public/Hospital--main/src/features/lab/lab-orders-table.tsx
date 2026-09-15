"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FlaskConical } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { LabOrderStatusActions } from "./lab-order-status-actions";

export type LabOrderRow = {
  id: string;
  orderNo: string;
  patientNameAr: string;
  patientNameEn: string;
  mrn: string;
  doctorNameAr: string | null;
  doctorNameEn: string | null;
  priority: string;
  status: string;
  itemCount: number;
  resultCount: number;
  createdAt: string;
};

const STATUS_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "destructive"> = {
  ORDERED: "info",
  COLLECTED: "secondary",
  RECEIVED: "secondary",
  PROCESSING: "warning",
  COMPLETED: "success",
  REVIEWED: "default",
  CANCELLED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  ORDERED: "laboratory.statusOrdered",
  COLLECTED: "laboratory.statusCollected",
  RECEIVED: "laboratory.statusReceived",
  PROCESSING: "laboratory.statusProcessing",
  COMPLETED: "laboratory.statusCompleted",
  REVIEWED: "laboratory.statusReviewed",
  CANCELLED: "laboratory.statusCancelled",
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<LabOrderRow>[] {
  return [
    {
      id: "orderNo",
      header: t("laboratory.orderNo"),
      renderRow: (row) => (
        <Link href={`/laboratory/orders/${row.id}`} className="font-medium hover:underline">
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
      id: "doctor",
      header: t("common.doctor"),
      renderRow: (row) => <span className="truncate">{row.doctorNameAr && locale === "ar" ? row.doctorNameAr : row.doctorNameEn ?? "—"}</span>,
      exportValue: (row) => (locale === "ar" ? row.doctorNameAr ?? "" : row.doctorNameEn ?? ""),
    },
    {
      id: "priority",
      header: t("laboratory.priority"),
      renderRow: (row) => <Badge variant={row.priority === "ROUTINE" ? "outline" : row.priority === "STAT" ? "destructive" : "warning"}>{row.priority}</Badge>,
      exportValue: (row) => row.priority,
    },
    {
      id: "tests",
      header: t("laboratory.testCount"),
      renderRow: (row) => <span className="tabular-nums">{t("laboratory.testCount")}: {row.itemCount} · {t("laboratory.resultCount")}: {row.resultCount}</span>,
      exportValue: (row) => `${row.itemCount} tests`,
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
      renderRow: (row) => (row.status === "REVIEWED" || row.status === "CANCELLED" ? null : <LabOrderStatusActions orderId={row.id} status={row.status} />),
    },
  ];
}

export function LabOrdersTable({ rows, locale }: { rows: LabOrderRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("laboratory.orders")}`}
      searchValue={(r) => `${r.orderNo} ${r.patientNameAr} ${r.patientNameEn} ${r.mrn}`}
      emptyIcon={FlaskConical}
      emptyTitle={tr("laboratory.noOrders")}
      showColumnsControl={false}
    />
  );
}
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, BedDouble } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type AdmissionRow = {
  id: string;
  admissionNo: string;
  patientNameAr: string;
  patientNameEn: string;
  mrn: string;
  departmentNameAr: string | null;
  departmentNameEn: string | null;
  bedCode: string | null;
  roomNameAr: string | null;
  roomNameEn: string | null;
  doctorNameAr: string | null;
  doctorNameEn: string | null;
  status: string;
  isIcu: boolean;
  admittedAt: string;
};

const STATUS_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "muted" | "destructive"> = {
  ADMITTED: "success",
  TRANSFERRED: "info",
  DISCHARGED: "muted",
  CANCELLED: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  ADMITTED: "admissions.statusAdmitted",
  DISCHARGED: "admissions.statusDischarged",
  TRANSFERRED: "admissions.statusTransferred",
  CANCELLED: "admissions.statusCancelled",
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<AdmissionRow>[] {
  return [
    {
      id: "admissionNo",
      header: t("admissions.title"),
      renderRow: (row) => (
        <Link href={`/admissions/${row.id}`} className="font-medium hover:underline">
          {row.admissionNo}
        </Link>
      ),
      sortValue: (row) => row.admissionNo,
    },
    {
      id: "patient",
      header: t("common.patient"),
      renderRow: (row) => (
        <span className="truncate">
          {locale === "ar" ? row.patientNameAr : row.patientNameEn}
          <span className="text-muted-foreground ml-1 text-xs">({row.mrn})</span>
        </span>
      ),
      sortValue: (row) => (locale === "ar" ? row.patientNameAr : row.patientNameEn),
    },
    {
      id: "bed",
      header: t("admissions.room"),
      renderRow: (row) =>
        row.bedCode ? (
          <span className="truncate">
            {row.bedCode}
            <span className="text-muted-foreground ml-1 text-xs">{locale === "ar" ? row.roomNameAr : row.roomNameEn ?? ""}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "department",
      header: t("admissions.department"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.departmentNameAr : row.departmentNameEn ?? "—"}</span>,
    },
    {
      id: "doctor",
      header: t("admissions.attendingDoctor"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.doctorNameAr : row.doctorNameEn ?? "—"}</span>,
    },
    {
      id: "admittedAt",
      header: t("admissions.admittedAt"),
      renderRow: (row) => <span className="tabular-nums text-xs">{new Date(row.admittedAt).toLocaleDateString()}</span>,
      sortValue: (row) => row.admittedAt,
    },
    {
      id: "status",
      header: t("common.status"),
      renderRow: (row) => (
        <span className="flex items-center gap-1.5">
          {row.isIcu && <Badge variant="destructive">ICU</Badge>}
          <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>{t(STATUS_LABEL[row.status] ?? row.status)}</Badge>
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      renderRow: (row) => (
        <Link
          href={`/admissions/${row.id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          {t("common.view")} <ArrowRight className="size-3" />
        </Link>
      ),
    },
  ];
}

export function AdmissionsTable({ rows, locale }: { rows: AdmissionRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("admissions.title")}`}
      searchValue={(r) => `${r.admissionNo} ${r.patientNameAr} ${r.patientNameEn} ${r.mrn} ${r.bedCode ?? ""}`}
      emptyIcon={BedDouble}
      emptyTitle={tr("admissions.noAdmissions")}
      showColumnsControl={false}
    />
  );
}
"use client";

import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type PrescriptionRow = {
  id: string;
  prescriptionNo: string;
  patientNameAr: string;
  patientNameEn: string;
  mrn: string;
  doctorNameAr: string | null;
  doctorNameEn: string | null;
  departmentNameAr: string | null;
  departmentNameEn: string | null;
  createdAt: string;
  itemCount: number;
  dispensedCount: number;
}

export function PrescriptionsTable({ rows, locale }: { rows: PrescriptionRow[]; locale: string }) {
  const t = useTranslations("pharmacy");
  const patientName = (r: PrescriptionRow) => (locale === "ar" ? r.patientNameAr : r.patientNameEn);
  const doctorName = (r: PrescriptionRow) =>
    locale === "ar" ? r.doctorNameAr : r.doctorNameEn;

  const columns: ColumnDef<PrescriptionRow>[] = [
    {
      id: "no",
      header: t("batchNo"),
      accessorKey: "prescriptionNo",
      renderRow: (r) => (
        <Link href={`/pharmacy/prescriptions/${r.id}`} className="font-mono text-xs font-medium hover:underline">
          {r.prescriptionNo}
        </Link>
      ),
    },
    {
      id: "patient",
      header: t("itemName"),
      accessorKey: "patientNameEn",
      sortValue: (r) => patientName(r),
      renderRow: (r) => (
        <div>
          <p className="font-medium">{patientName(r)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{r.mrn}</p>
        </div>
      ),
    },
    {
      id: "doctor",
      header: "Doctor",
      accessorKey: "doctorNameEn",
      renderRow: (r) => <span className="text-muted-foreground">{doctorName(r) ?? "—"}</span>,
    },
    {
      id: "date",
      header: t("orderedDate"),
      accessorKey: "createdAt",
      sortValue: (r) => r.createdAt,
      renderRow: (r) => (
        <span className="text-muted-foreground text-xs">
          {new Date(r.createdAt).toLocaleString(locale === "ar" ? "ar-YE" : "en-US")}
        </span>
      ),
    },
    {
      id: "items",
      header: t("quantity"),
      accessorKey: "itemCount",
      sortValue: (r) => r.itemCount,
      renderRow: (r) => (
        <Badge variant={r.dispensedCount === r.itemCount ? "success" : "info"}>
          {r.dispensedCount}/{r.itemCount}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={t("pendingDispense")}
      searchValue={(r) =>
        [r.prescriptionNo, r.patientNameAr, r.patientNameEn, r.mrn].join(" ")
      }
      emptyIcon={FilePlus2}
      emptyTitle={t("prescriptions")}
      emptyHint={t("pendingDispense")}
      exportFilename="prescriptions"
    />
  );
}
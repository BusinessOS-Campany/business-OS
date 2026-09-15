"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ClipboardList } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type NursingNoteRow = {
  id: string;
  admissionId: string | null;
  admissionNo: string | null;
  patientNameAr: string | null;
  patientNameEn: string | null;
  mrn: string | null;
  category: string;
  note: string;
  authorNameAr: string | null;
  authorNameEn: string | null;
  createdAt: string;
};

const CATEGORY_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "muted" | "destructive"> = {
  GENERAL: "secondary",
  ROUND: "info",
  PAIN: "destructive",
  WOUND: "warning",
  IO: "success",
  DISCHARGE: "default",
};

const CATEGORY_LABEL: Record<string, string> = {
  GENERAL: "nursing.catGeneral",
  ROUND: "nursing.catRound",
  PAIN: "nursing.catPain",
  WOUND: "nursing.catWound",
  IO: "nursing.catIO",
  DISCHARGE: "nursing.catDischarge",
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<NursingNoteRow>[] {
  return [
    {
      id: "patient",
      header: t("nursing.patient"),
      renderRow: (row) =>
        row.admissionNo ? (
          <span className="truncate">
            <Link href={`/admissions/${row.admissionId}`} className="font-medium hover:underline">
              {row.admissionNo}
            </Link>
            <span className="text-muted-foreground ml-1 text-xs">
              {locale === "ar" ? row.patientNameAr : row.patientNameEn}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "category",
      header: t("nursing.noteCategory"),
      renderRow: (row) => <Badge variant={CATEGORY_VARIANT[row.category] ?? "outline"}>{t(CATEGORY_LABEL[row.category] ?? row.category)}</Badge>,
    },
    {
      id: "note",
      header: t("common.notes"),
      renderRow: (row) => <span className="line-clamp-1 max-w-[240px]">{row.note}</span>,
    },
    {
      id: "author",
      header: t("nursing.author"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.authorNameAr : row.authorNameEn ?? "—"}</span>,
    },
    {
      id: "createdAt",
      header: t("nursing.recordedAt"),
      renderRow: (row) => <span className="tabular-nums text-xs">{new Date(row.createdAt).toLocaleString()}</span>,
      sortValue: (row) => row.createdAt,
    },
  ];
}

export function NursingNotesTable({ rows, locale }: { rows: NursingNoteRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("nursing.notes")}`}
      searchValue={(r) => `${r.note} ${r.admissionNo ?? ""} ${r.patientNameAr ?? ""} ${r.patientNameEn ?? ""}`}
      emptyIcon={ClipboardList}
      emptyTitle={tr("nursing.noNotes")}
      showColumnsControl={false}
    />
  );
}
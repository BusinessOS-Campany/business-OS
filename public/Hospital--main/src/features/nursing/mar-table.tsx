"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MoreHorizontal, Pill } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateMarStatusAction } from "@/actions/nursing";

export type MarRow = {
  id: string;
  admissionId: string | null;
  admissionNo: string | null;
  patientNameAr: string | null;
  patientNameEn: string | null;
  mrn: string | null;
  medicationName: string;
  scheduledAt: string;
  doseGiven: string | null;
  marStatus: string;
  givenByNameAr: string | null;
  givenByNameEn: string | null;
  givenAt: string | null;
};

const STATUS_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "muted" | "destructive"> = {
  GIVEN: "success",
  OMITTED: "muted",
  REFUSED: "warning",
  HOLD: "info",
  SKIPPED: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  GIVEN: "nursing.marGiven",
  OMITTED: "nursing.marOmitted",
  REFUSED: "nursing.marRefused",
  HOLD: "nursing.marHold",
  SKIPPED: "nursing.marSkipped",
};

const MARK_OPTIONS = ["GIVEN", "OMITTED", "REFUSED", "HOLD", "SKIPPED"];

function buildColumns(locale: string, t: (k: string) => string, onMark: (id: string, status: string) => void): ColumnDef<MarRow>[] {
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
      id: "medication",
      header: t("nursing.medicationName"),
      renderRow: (row) => <span className="truncate font-medium">{row.medicationName}</span>,
    },
    {
      id: "scheduledAt",
      header: t("nursing.scheduledAt"),
      renderRow: (row) => <span className="tabular-nums text-xs">{new Date(row.scheduledAt).toLocaleString()}</span>,
      sortValue: (row) => row.scheduledAt,
    },
    {
      id: "dose",
      header: t("nursing.doseGiven"),
      renderRow: (row) => <span className="text-xs">{row.doseGiven ?? "—"}</span>,
    },
    {
      id: "givenBy",
      header: t("nursing.author"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.givenByNameAr : row.givenByNameEn ?? "—"}</span>,
    },
    {
      id: "status",
      header: t("common.status"),
      renderRow: (row) => <Badge variant={STATUS_VARIANT[row.marStatus] ?? "outline"}>{t(STATUS_LABEL[row.marStatus] ?? row.marStatus)}</Badge>,
    },
    {
      id: "actions",
      header: "",
      renderRow: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {MARK_OPTIONS.filter((s) => s !== row.marStatus).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onMark(row.id, s)}>
                {t(STATUS_LABEL[s])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

export function MarTable({ rows, locale }: { rows: MarRow[]; locale: string }) {
  const tr = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const mark = (id: string, status: string) => {
    startTransition(async () => {
      const res = await updateMarStatusAction(id, status, null, new FormData());
      if (res?.ok) {
        toast.success(tr("common.updated"));
        router.refresh();
      } else {
        toast.error(tr(res?.error ?? "common.error"));
      }
    });
  };

  return (
    <DataTable
      columns={buildColumns(locale, tr, mark)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("nursing.mar")}`}
      searchValue={(r) => `${r.medicationName} ${r.patientNameAr ?? ""} ${r.patientNameEn ?? ""} ${r.admissionNo ?? ""}`}
      emptyIcon={Pill}
      emptyTitle={tr("nursing.mar")}
      loading={isPending}
      showColumnsControl={false}
    />
  );
}
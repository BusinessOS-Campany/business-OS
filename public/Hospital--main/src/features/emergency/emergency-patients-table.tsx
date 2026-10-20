"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Siren } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmergencyTriageSelect } from "./emergency-triage-select";

export type EmergencyRow = {
  id: string;
  encounterNo: string;
  patientNameAr: string;
  patientNameEn: string;
  mrn: string;
  triageLevel: string | null;
  status: string;
  doctorNameAr: string | null;
  doctorNameEn: string | null;
  chiefComplaint: string | null;
  createdAt: string;
  latestVital: { pulse: number | null; systolic: number | null } | null;
};

const TRIAGE_VARIANT: Record<string, "destructive" | "warning" | "info" | "secondary" | "outline"> = {
  RESUSCITATION: "destructive",
  EMERGENT: "warning",
  URGENT: "info",
  LESS_URGENT: "secondary",
  NON_URGENT: "outline",
};

const TRIAGE_LABEL: Record<string, string> = {
  RESUSCITATION: "emergency.triageResuscitation",
  EMERGENT: "emergency.triageEmergent",
  URGENT: "emergency.triageUrgent",
  LESS_URGENT: "emergency.triageLessUrgent",
  NON_URGENT: "emergency.triageNonUrgent",
};

function buildColumns(locale: string, t: (k: string) => string): ColumnDef<EmergencyRow>[] {
  return [
    {
      id: "patient",
      header: t("common.patient"),
      renderRow: (row) => (
        <Link href={`/encounters/${row.id}`} className="font-medium hover:underline">
          {locale === "ar" ? row.patientNameAr : row.patientNameEn}
          <span className="ml-1 text-muted-foreground text-xs">({row.mrn})</span>
        </Link>
      ),
      sortValue: (row) => (locale === "ar" ? row.patientNameAr : row.patientNameEn),
    },
    {
      id: "triage",
      header: t("emergency.triageLevel"),
      renderRow: (row) => (
        row.triageLevel ? (
          <Badge variant={TRIAGE_VARIANT[row.triageLevel] ?? "outline"}>{t(TRIAGE_LABEL[row.triageLevel] ?? row.triageLevel)}</Badge>
        ) : (
          <EmergencyTriageSelect encounterId={row.id} currentLevel={row.triageLevel} />
        )
      ),
    },
    {
      id: "chiefComplaint",
      header: "Chief complaint",
      renderRow: (row) => <span className="max-w-[180px] truncate text-sm">{row.chiefComplaint ?? "—"}</span>,
    },
    {
      id: "doctor",
      header: t("common.doctor"),
      renderRow: (row) => <span className="truncate">{locale === "ar" ? row.doctorNameAr : row.doctorNameEn ?? "—"}</span>,
    },
    {
      id: "vitals",
      header: "Vitals",
      renderRow: (row) => row.latestVital ? (
        <span className="tabular-nums text-xs">
          {row.latestVital.pulse ?? "—"} bpm · {row.latestVital.systolic ?? "—"} mmHg
        </span>
      ) : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "status",
      header: t("common.status"),
      renderRow: (row) => <Badge variant={row.status === "WAITING" ? "warning" : row.status === "COMPLETED" ? "success" : "info"}>{row.status}</Badge>,
    },
    {
      id: "time",
      header: "Time",
      renderRow: (row) => {
        const mins = Math.floor((Date.now() - new Date(row.createdAt).getTime()) / 60000);
        return <span className="tabular-nums text-xs">{mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`}</span>;
      },
    },
  ];
}

export function EmergencyPatientsTable({ rows, locale }: { rows: EmergencyRow[]; locale: string }) {
  const tr = useTranslations();
  return (
    <DataTable
      columns={buildColumns(locale, tr)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tr("common.search")} ${tr("emergency.patients")}`}
      searchValue={(r) => `${r.encounterNo} ${r.patientNameAr} ${r.patientNameEn} ${r.mrn} ${r.chiefComplaint ?? ""}`}
      emptyIcon={Siren}
      emptyTitle={tr("emergency.patients")}
      showColumnsControl={false}
    />
  );
}
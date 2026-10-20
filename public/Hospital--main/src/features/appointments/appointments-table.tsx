"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarClockIcon, CalendarPlus2, ArrowUpRightIcon } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export type AppointmentTableRow = {
  id: string;
  appointmentNo: string;
  patientId: string;
  patientNameAr: string;
  patientNameEn: string;
  patientMrn: string;
  doctorNameAr: string | null;
  doctorNameEn: string | null;
  departmentNameAr: string | null;
  departmentNameEn: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  priority: string;
  appointmentType: string;
  queueTicket: string | null;
} & Record<string, unknown>;

const STATUS_KEY: Record<string, string> = {
  SCHEDULED: "statusScheduled",
  CONFIRMED: "statusConfirmed",
  ARRIVED: "statusArrived",
  WAITING: "statusWaiting",
  IN_CONSULTATION: "statusInConsultation",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
  NO_SHOW: "statusNoShow",
};

type BadgeVariant = "info" | "default" | "destructive" | "outline" | "secondary" | "success" | "warning" | "muted";

const STATUS_COLOR: Record<string, BadgeVariant> = {
  SCHEDULED: "outline",
  CONFIRMED: "secondary",
  ARRIVED: "default",
  WAITING: "default",
  IN_CONSULTATION: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

const TYPE_KEY: Record<string, string> = {
  OUTPATIENT: "typeOutpatient",
  FOLLOW_UP: "typeFollowUp",
  EMERGENCY: "typeEmergency",
  PROCEDURE: "typeProcedure",
  INPATIENT: "typeInpatient",
};

const PRIORITY_KEY: Record<string, string> = {
  ROUTINE: "priorityRoutine",
  URGENT: "priorityUrgent",
  EMERGENCY: "priorityEmergency",
  STAT: "priorityStat",
};

export function AppointmentsTable({
  rows,
  locale,
}: {
  rows: AppointmentTableRow[];
  locale: string;
}) {
  const t = useTranslations("appointments");
  const tc = useTranslations("common");
  const tr = useTranslations("reception");

  const timeOf = (iso: string) => {
    const d = new Date(iso);
    return locale === "ar"
      ? d.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const columns: ColumnDef<AppointmentTableRow>[] = [
    {
      id: "time",
      header: tc("time"),
      renderRow: (row) => (
        <span className="whitespace-nowrap text-sm font-medium tabular-nums">
          {timeOf(row.scheduledAt)}
        </span>
      ),
      sortValue: (row) => row.scheduledAt,
      className: "w-24",
      hideable: false,
    },
    {
      id: "patient",
      header: t("bookedFor"),
      renderRow: (row) => (
        <Link href={`/patients/${row.patientId}`} className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback>{initials(locale === "ar" ? row.patientNameAr : row.patientNameEn || "")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{locale === "ar" ? row.patientNameAr : row.patientNameEn}</p>
            <p className="truncate text-xs text-muted-foreground tabular-nums">{row.patientMrn}</p>
          </div>
        </Link>
      ),
      sortValue: (row) => row.patientNameAr,
      className: "min-w-48",
    },
    {
      id: "doctor",
      header: t("doctorLabel"),
      renderRow: (row) =>
        row.doctorNameAr ? (
          <span>{locale === "ar" ? row.doctorNameAr : row.doctorNameEn}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (row) => row.doctorNameAr ?? "",
    },
    {
      id: "department",
      header: t("departmentLabel"),
      renderRow: (row) =>
        row.departmentNameAr ? (
          <span className="text-muted-foreground">
            {locale === "ar" ? row.departmentNameAr : row.departmentNameEn}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "type",
      header: t("type"),
      renderRow: (row) => t(TYPE_KEY[row.appointmentType] ?? "typeOutpatient"),
      exportValue: (row) => row.appointmentType,
    },
    {
      id: "status",
      header: t("status"),
      renderRow: (row) => (
        <Badge variant={STATUS_COLOR[row.status] ?? "outline"}>
          {t(STATUS_KEY[row.status] ?? "statusScheduled")}
        </Badge>
      ),
      sortValue: (row) => row.status,
      exportValue: (row) => row.status,
    },
    {
      id: "ticket",
      header: t("queueTicket"),
      renderRow: (row) =>
        row.queueTicket ? (
          <span className="font-mono text-xs text-foreground tabular-nums">{row.queueTicket}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("noQueueTicket")}</span>
        ),
      hideable: true,
    },
    {
      id: "actions",
      header: "",
      className: "w-12",
      hideable: false,
      renderRow: (row) => (
        <Link
          href={`/appointments/${row.id}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={tc("view")}
        >
          <ArrowUpRightIcon className="size-4" />
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={t("searchPatient")}
      searchValue={(row) =>
        `${row.patientNameAr} ${row.patientNameEn} ${row.patientMrn} ${row.doctorNameEn ?? ""} ${row.appointmentNo}`
      }
      emptyIcon={CalendarClockIcon}
      emptyTitle={t("noneScheduled")}
      emptyHint={tr("noPatientsWaiting")}
      emptyActionLabel={t("new")}
      emptyActionHref="/appointments/new"
      exportFilename="appointments"
      toolbarActions={
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/appointments/new">
            <CalendarPlus2 className="size-3.5" />
            {t("new")}
          </Link>
        </Button>
      }
    />
  );
}
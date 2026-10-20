"use client";

import { useTranslations } from "next-intl";
import { CalendarX2 } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { LeaveActions } from "./leave-actions";

export type LeaveRow = {
  id: string;
  employeeNameAr: string;
  employeeNameEn: string;
  employeeNo: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: string;
} & Record<string, unknown>;

const LEAVE_TYPE_KEY: Record<string, string> = {
  ANNUAL: "hr.typeAnnual",
  SICK: "hr.typeSick",
  UNPAID: "hr.typeUnpaid",
  MATERNITY: "hr.typeMaternity",
  PILGRIMAGE: "hr.typePilgrimage",
  OTHER: "hr.typeOther",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "hr.statusPending",
  APPROVED: "hr.statusApproved",
  REJECTED: "hr.statusRejected",
  CANCELLED: "hr.statusCancelled",
};

const STATUS_VARIANT: Record<string, "warning" | "success" | "destructive" | "muted" | "default"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  CANCELLED: "muted",
};

function buildColumns(locale: string, t: (k: string) => string, tc: (k: string) => string): ColumnDef<LeaveRow>[] {
  return [
    {
      id: "employee",
      header: tc("name"),
      renderRow: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{locale === "ar" ? row.employeeNameAr : row.employeeNameEn}</p>
          <p className="truncate text-xs text-muted-foreground">{row.employeeNo}</p>
        </div>
      ),
      sortValue: (row) => (locale === "ar" ? row.employeeNameAr : row.employeeNameEn),
    },
    {
      id: "leaveType",
      header: t("hr.leaveType"),
      renderRow: (row) => <span>{t(LEAVE_TYPE_KEY[row.leaveType] ?? row.leaveType)}</span>,
    },
    {
      id: "startDate",
      header: t("hr.startDate"),
      renderRow: (row) => <span className="tabular-nums text-xs">{new Date(`${row.startDate}T00:00:00`).toLocaleDateString()}</span>,
      sortValue: (row) => row.startDate,
    },
    {
      id: "endDate",
      header: t("hr.endDate"),
      renderRow: (row) => <span className="tabular-nums text-xs">{new Date(`${row.endDate}T00:00:00`).toLocaleDateString()}</span>,
      sortValue: (row) => row.endDate,
    },
    {
      id: "days",
      header: t("hr.days"),
      renderRow: (row) => <span className="tabular-nums text-xs">{row.days}</span>,
      sortValue: (row) => row.days,
    },
    {
      id: "reason",
      header: tc("notes"),
      renderRow: (row) => <span className="max-w-[160px] truncate">{row.reason ?? "—"}</span>,
    },
    {
      id: "status",
      header: tc("status"),
      renderRow: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "default"}>{t(STATUS_LABEL[row.status] ?? row.status)}</Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      renderRow: (row) =>
        row.status === "PENDING" ? <LeaveActions leaveId={row.id} status={row.status} /> : null,
    },
  ];
}

export function LeaveTable({ rows, locale }: { rows: LeaveRow[]; locale: string }) {
  const t = useTranslations();
  const tc = useTranslations("common");
  return (
    <DataTable
      columns={buildColumns(locale, t, tc)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tc("search")} ${t("hr.leave")}`}
      searchValue={(r) => `${r.employeeNameAr} ${r.employeeNameEn} ${r.employeeNo} ${r.leaveType}`}
      emptyIcon={CalendarX2}
      emptyTitle={t("hr.statusPending")}
      showColumnsControl={false}
    />
  );
}
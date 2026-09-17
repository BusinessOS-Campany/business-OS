"use client";

import { useTranslations } from "next-intl";
import { ClipboardCheck } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export type AttendanceRow = {
  id: string;
  employeeNameAr: string;
  employeeNameEn: string;
  employeeNo: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
} & Record<string, unknown>;

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "hr.present",
  ABSENT: "hr.absent",
  LATE: "hr.late",
  LEAVE: "hr.leave",
  OVERTIME: "payroll.overtime",
};

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "info" | "muted" | "default"> = {
  PRESENT: "success",
  ABSENT: "destructive",
  LATE: "warning",
  LEAVE: "info",
  OVERTIME: "default",
};

function buildColumns(locale: string, t: (k: string) => string, tc: (k: string) => string): ColumnDef<AttendanceRow>[] {
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
      id: "date",
      header: tc("date"),
      renderRow: (row) => <span className="tabular-nums text-xs">{new Date(`${row.date}T00:00:00`).toLocaleDateString()}</span>,
      sortValue: (row) => row.date,
    },
    {
      id: "checkIn",
      header: `${tc("time")} In`,
      renderRow: (row) => <span className="tabular-nums text-xs">{row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>,
    },
    {
      id: "checkOut",
      header: `${tc("time")} Out`,
      renderRow: (row) => <span className="tabular-nums text-xs">{row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>,
    },
    {
      id: "status",
      header: tc("status"),
      renderRow: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "default"}>{t(STATUS_LABEL[row.status] ?? row.status)}</Badge>
      ),
    },
  ];
}

export function AttendanceTable({ rows, locale }: { rows: AttendanceRow[]; locale: string }) {
  const t = useTranslations();
  const tc = useTranslations("common");
  return (
    <DataTable
      columns={buildColumns(locale, t, tc)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tc("search")} ${t("hr.attendance")}`}
      searchValue={(r) => `${r.employeeNameAr} ${r.employeeNameEn} ${r.employeeNo} ${r.date}`}
      emptyIcon={ClipboardCheck}
      emptyTitle={t("hr.attendance")}
      showColumnsControl={false}
    />
  );
}
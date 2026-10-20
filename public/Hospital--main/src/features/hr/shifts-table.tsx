"use client";

import { useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";

export type ShiftRow = {
  id: string;
  employeeNameAr: string;
  employeeNameEn: string;
  employeeNo: string;
  shiftNameAr: string;
  shiftNameEn: string;
  startTime: string;
  endTime: string;
  date: string;
} & Record<string, unknown>;

function buildColumns(locale: string, t: (k: string) => string, tc: (k: string) => string): ColumnDef<ShiftRow>[] {
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
      id: "shift",
      header: t("hr.shifts"),
      renderRow: (row) => <span>{locale === "ar" ? row.shiftNameAr : row.shiftNameEn}</span>,
    },
    {
      id: "startTime",
      header: `${tc("time")} Start`,
      renderRow: (row) => <span className="tabular-nums text-xs">{row.startTime}</span>,
    },
    {
      id: "endTime",
      header: `${tc("time")} End`,
      renderRow: (row) => <span className="tabular-nums text-xs">{row.endTime}</span>,
    },
    {
      id: "date",
      header: tc("date"),
      renderRow: (row) => <span className="tabular-nums text-xs">{new Date(`${row.date}T00:00:00`).toLocaleDateString()}</span>,
      sortValue: (row) => row.date,
    },
  ];
}

export function ShiftsTable({ rows, locale }: { rows: ShiftRow[]; locale: string }) {
  const t = useTranslations();
  const tc = useTranslations("common");
  return (
    <DataTable
      columns={buildColumns(locale, t, tc)}
      data={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={`${tc("search")} ${t("hr.shifts")}`}
      searchValue={(r) => `${r.employeeNameAr} ${r.employeeNameEn} ${r.employeeNo} ${r.shiftNameAr} ${r.shiftNameEn} ${r.date}`}
      emptyIcon={CalendarClock}
      emptyTitle={t("hr.shifts")}
      showColumnsControl={false}
    />
  );
}
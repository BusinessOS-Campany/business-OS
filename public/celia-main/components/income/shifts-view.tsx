"use client";

import type { ShiftsStats } from "@/lib/income/shifts";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-provider";
import { DataTable } from "@/components/ui/data-table";

interface ShiftsViewProps {
  initialStats: ShiftsStats;
}

export function ShiftsView({ initialStats }: ShiftsViewProps) {
  const { locale, t } = useLocale();
  const s = t.shifts;
  const rows = initialStats.rows;

  function formatDay(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <DataTable
      rows={rows}
      title={s.totalTable}
      keyOf={(row) => `${row.day}-${row.period}`}
      searchText={(row) => `${formatDay(row.day)} ${row.period === "morning" ? s.morning : s.evening}`}
      labels={t.dataTable}
      columns={[
        {
          header: s.period,
          cell: (row) => (
            <span
              className={
                row.period === "morning"
                  ? "inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success"
                  : "inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary"
              }
            >
              {row.period === "morning" ? s.morning : s.evening}
            </span>
          ),
        },
        {
          header: s.copy,
          cell: (row) => (
            <span className="text-sm tabular-nums text-foreground">{formatCurrency(row.copy)}</span>
          ),
        },
        {
          header: s.sales,
          cell: (row) => (
            <span className="text-sm tabular-nums text-foreground">{formatCurrency(row.sales)}</span>
          ),
        },
        {
          header: s.hobani,
          cell: (row) => (
            <span className="text-sm tabular-nums text-foreground">{formatCurrency(row.hobani)}</span>
          ),
        },
        {
          header: s.date,
          cell: (row) => (
            <span className="text-sm font-bold text-foreground">{formatDay(row.day)}</span>
          ),
        },
      ]}
    />
  );
}

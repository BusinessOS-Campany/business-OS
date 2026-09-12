"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { MonthlyRevenuePoint } from "@/lib/dashboard/stats";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n/locale-provider";

const RevenueBarChart = dynamic(
  () => import("@/components/charts/revenue-bar-chart").then((m) => m.RevenueBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[250px] w-full animate-pulse rounded-lg bg-muted/60 py-2" />
    ),
  },
);

interface RevenueChartProps {
  months: MonthlyRevenuePoint[];
  className?: string;
}

type Period = "all" | "1m" | "6m";

const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "1m", label: "1M" },
  { key: "6m", label: "6M" },
];

type SummaryKey = "profit" | "expenses" | "net" | "advance";

function summaryValue(point: MonthlyRevenuePoint, key: SummaryKey): number {
  switch (key) {
    case "net":
      return point.profit - point.expenses;
    default:
      return point[key];
  }
}

export function RevenueChart({ months, className }: RevenueChartProps) {
  const { t } = useLocale();
  const [period, setPeriod] = useState<Period>("6m");

  const summaryItems = useMemo(
    () => [
      { key: "profit" as const, label: t.dashboard.revenueChart.profit },
      { key: "expenses" as const, label: t.dashboard.revenueChart.expenses },
      { key: "net" as const, label: t.dashboard.revenueChart.netProfit },
      { key: "advance" as const, label: t.dashboard.revenueChart.advance },
    ],
    [t],
  );

  const data = useMemo(() => {
    switch (period) {
      case "1m":
        return months.slice(-1);
      case "6m":
        return months.slice(-6);
      default:
        return months;
    }
  }, [months, period]);

  const current = months[months.length - 1];

  return (
    <div className={cn("rounded-2xl border border-border bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h3 className="text-base font-extrabold text-foreground">
          {t.dashboard.revenueChart.title}
        </h3>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-bold transition-colors",
                period === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-primary hover:bg-primary/10",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-5 pt-4 sm:grid-cols-4">
        {summaryItems.map(({ key, label }) => (
          <div key={key} className="rounded-xl bg-muted/60 p-3">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <h6 className="mt-0.5 truncate text-sm font-extrabold tabular-nums text-foreground">
              {formatCurrency(summaryValue(current, key))}
            </h6>
          </div>
        ))}
      </div>

      <RevenueBarChart data={data} />
    </div>
  );
}


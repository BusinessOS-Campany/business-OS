"use client";

import type { DashboardStats, DayStats } from "@/lib/dashboard/stats";
import { compare, type Comparison } from "@/lib/dashboard/compare";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n/locale-provider";
import { RevenueChart } from "@/components/dashboard/revenue-chart";

interface ReportCardProps {
  stats: DashboardStats;
}

interface ProgressMetric {
  key: keyof DayStats;
  label: string;
  barClass: string;
  format: (value: number) => string;
}

interface FooterMetric {
  key: keyof DayStats;
  label: string;
  format: (value: number) => string;
}

function progressWidth(today: number, yesterday: number): number {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return Math.min(100, Math.round((today / yesterday) * 100));
}

function ComparisonCell({
  metric,
  comparison,
  statusLabel,
}: {
  metric: FooterMetric;
  comparison: Comparison;
  statusLabel: string;
}) {
  const { status } = comparison;
  return (
    <div className="px-4 py-3 text-center">
      <span
        className={cn(
          "inline-flex items-center gap-1 text-sm font-bold",
          status === "up" && "text-success",
          status === "down" && "text-destructive",
          status === "same" && "text-muted-foreground",
        )}
      >
        {status === "up" && <span aria-hidden="true">▲</span>}
        {status === "down" && <span aria-hidden="true">▼</span>}
        {formatPercent(comparison.percent)}
      </span>
      <p className="mt-1 text-lg font-extrabold text-foreground">
        {metric.format(comparison.diff)}
      </p>
      <p className="text-xs font-medium uppercase text-muted-foreground">{metric.label}</p>
      <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{statusLabel}</p>
    </div>
  );
}

export function ReportCard({ stats }: ReportCardProps) {
  const { t } = useLocale();
  const p = t.dashboard.report.progress;

  const progressMetrics: ProgressMetric[] = [
    { key: "completedCopies", label: p.completedCopies, barClass: "bg-primary", format: formatNumber },
    { key: "uncompletedCopies", label: p.uncompletedCopies, barClass: "bg-destructive", format: formatNumber },
    { key: "sizeGB", label: p.sizeGB, barClass: "bg-success", format: formatNumber },
    { key: "hobaniIncome", label: p.hobaniIncome, barClass: "bg-warning", format: formatCurrency },
  ];

  const footerMetrics: FooterMetric[] = [
    { key: "completedCopies", label: p.completedCopies, format: formatNumber },
    { key: "sizeGB", label: p.sizeGB, format: formatNumber },
    { key: "hobaniIncome", label: p.hobaniIncome, format: formatCurrency },
    { key: "uncompletedCopies", label: p.uncompletedCopies, format: formatNumber },
  ];

  const statusText: Record<Comparison["status"], string> = {
    up: t.dashboard.report.status.up,
    down: t.dashboard.report.status.down,
    same: t.dashboard.report.status.same,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <RevenueChart months={stats.revenueChart.months} className="lg:col-span-2" />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-4 text-center text-sm font-bold text-foreground">
          {t.dashboard.report.title}
        </p>
        <div className="space-y-5">
          {progressMetrics.map((metric) => {
            const today = stats.today[metric.key];
            const yesterday = stats.yesterday[metric.key];
            const width = progressWidth(today, yesterday);
            return (
              <div key={metric.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="font-semibold text-foreground">
                    <b>{metric.format(today)}</b>
                    <span className="text-muted-foreground"> / {metric.format(yesterday)}</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", metric.barClass)}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card px-2 py-4 shadow-sm lg:col-span-3 lg:grid-cols-4">
        {footerMetrics.map((metric) => {
          const comparison = compare(stats.today[metric.key], stats.yesterday[metric.key]);
          return (
            <ComparisonCell
              key={metric.key}
              metric={metric}
              comparison={comparison}
              statusLabel={statusText[comparison.status]}
            />
          );
        })}
      </footer>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { Package } from "lucide-react";
import type { IncomeSummaryStats } from "@/lib/income/summary";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n/locale-provider";

const DonutChart = dynamic(
  () => import("@/components/charts/donut-chart").then((m) => m.DonutChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <span className="size-10 animate-spin rounded-full border-[3px] border-muted border-t-primary" />
      </div>
    ),
  },
);

type IncomeSummarySection = "dailyIncome" | "incomeView" | "balanceTotals";

interface IncomeSummaryViewProps {
  initialStats: IncomeSummaryStats;
  section: IncomeSummarySection;
}

const DONUT_COLORS = [
  "var(--primary)",
  "var(--warning)",
  "var(--destructive)",
  "var(--success)",
];

export function IncomeSummaryView({ initialStats, section }: IncomeSummaryViewProps) {
  const { t, locale } = useLocale();
  const stats = initialStats;
  const iv = t[section];

  const rows = [
    {
      key: "copy" as const,
      label: iv.copy,
      value: stats.copy,
      percent: stats.copyPercent,
      barClass: "bg-primary",
      badgeClass: "bg-primary/15 text-primary",
    },
    {
      key: "hobani" as const,
      label: iv.hobani,
      value: stats.hobani,
      percent: stats.hobaniPercent,
      barClass: "bg-warning",
      badgeClass: "bg-warning/15 text-warning",
    },
    {
      key: "sales" as const,
      label: iv.sales,
      value: stats.sales,
      percent: stats.salesPercent,
      barClass: "bg-destructive",
      badgeClass: "bg-destructive/15 text-destructive",
    },
    {
      key: "wallet" as const,
      label: iv.wallet,
      value: stats.wallet,
      percent: stats.walletPercent,
      barClass: "bg-success",
      badgeClass: "bg-success/15 text-success",
    },
  ];

  const donutData = [
    { name: iv.copy, value: stats.copy },
    { name: iv.hobani, value: stats.hobani },
    { name: iv.sales, value: stats.sales },
    { name: iv.wallet, value: stats.wallet },
  ].filter((entry) => entry.value > 0);

  const shiftRows = [
    {
      key: "morning" as const,
      label: iv.morningShift,
      value: stats.morning,
      percent: stats.morningPercent,
      textClass: "text-destructive",
      badgeClass: "bg-destructive/15 text-destructive",
    },
    {
      key: "evening" as const,
      label: iv.eveningShift,
      value: stats.evening,
      percent: stats.eveningPercent,
      textClass: "text-success",
      badgeClass: "bg-success/15 text-success",
    },
    {
      key: "total" as const,
      label: iv.total,
      value: stats.totalCopies,
      percent: 100,
      textClass: "text-primary",
      badgeClass: "bg-primary/15 text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <header className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-extrabold text-foreground">{iv.totalTable}</h3>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-120 text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-start text-xs font-bold text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 text-start font-bold">
                  #
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-bold">
                  {iv.incomeType}
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-bold">
                  {iv.incomeStats}
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-bold">
                  {iv.incomePercent}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.key}
                  className="border-b border-border/60 last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    {index + 1}.
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground">{row.label}</td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-64 items-center gap-2">
                      <div className="h-2 w-full min-w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", row.barClass)}
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(row.value)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold",
                        row.badgeClass,
                      )}
                    >
                      {row.percent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-extrabold text-foreground">{iv.countStats}</h3>
          <div className="relative h-56">
            <DonutChart
              data={donutData}
              colors={DONUT_COLORS}
              tooltipFormatter={(value) => formatCurrency(value)}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">{iv.total}</span>
              <span className="text-lg font-extrabold tabular-nums text-foreground">
                {formatCurrency(stats.total)}
              </span>
            </div>
          </div>
          <ul className="mt-4 space-y-1 border-t border-border/60 pt-3">
            {shiftRows.map((row) => (
              <li key={row.key}>
                <a
                  href="#"
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={cn("text-xs font-bold", row.textClass)}>
                    {row.key === "total"
                      ? `${formatNumber(row.value)}`
                      : `${formatCurrency(row.value)} · ${row.percent}%`}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
          <header className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-extrabold text-foreground">{iv.soldProducts}</h3>
          </header>
          {stats.products.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">{iv.noProducts}</p>
          ) : (
            <ul className="px-2 pb-2">
              {stats.products.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 border-t border-border/60 px-3 py-3 first:border-t-0"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                    <Package className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{product.name}</p>
                      <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatNumber(product.sizeGB)} GB · {formatDateTime(product.copiedAt, locale)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

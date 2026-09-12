"use client";

import dynamic from "next/dynamic";
import type { MonthlyIncomeStats } from "@/lib/income/monthly";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n/locale-provider";
import { DataTable } from "@/components/ui/data-table";

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

interface MonthlyIncomeViewProps {
  initialStats: MonthlyIncomeStats;
}

const DONUT_COLORS = [
  "var(--primary)",
  "var(--warning)",
  "var(--destructive)",
  "var(--success)",
];

export function MonthlyIncomeView({ initialStats }: MonthlyIncomeViewProps) {
  const { t } = useLocale();
  const stats = initialStats;
  const m = t.monthly;

  const rows = [
    {
      key: "copy" as const,
      label: m.copy,
      value: stats.copy,
      percent: stats.copyPercent,
      barClass: "bg-primary",
      badgeClass: "bg-primary/15 text-primary",
    },
    {
      key: "hobani" as const,
      label: m.hobani,
      value: stats.hobani,
      percent: stats.hobaniPercent,
      barClass: "bg-warning",
      badgeClass: "bg-warning/15 text-warning",
    },
    {
      key: "sales" as const,
      label: m.sales,
      value: stats.sales,
      percent: stats.salesPercent,
      barClass: "bg-destructive",
      badgeClass: "bg-destructive/15 text-destructive",
    },
    {
      key: "wallet" as const,
      label: m.wallet,
      value: stats.wallet,
      percent: stats.walletPercent,
      barClass: "bg-success",
      badgeClass: "bg-success/15 text-success",
    },
  ];

  const donutData = [
    { name: m.copy, value: stats.copy },
    { name: m.hobani, value: stats.hobani },
    { name: m.sales, value: stats.sales },
    { name: m.wallet, value: stats.wallet },
  ].filter((entry) => entry.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-extrabold text-foreground">{m.countStats}</h3>
          <div className="relative h-56">
            <DonutChart
              data={donutData}
              colors={DONUT_COLORS}
              tooltipFormatter={(value) => formatCurrency(value)}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">{m.total}</span>
              <span className="text-lg font-extrabold tabular-nums text-foreground">
                {formatCurrency(stats.total)}
              </span>
            </div>
          </div>
          <ul className="mt-4 space-y-1 border-t border-border/60 pt-3">
            <li>
              <a
                href="#"
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
              >
                <span className="text-muted-foreground">{m.totalCopies}</span>
                <span className="text-xs font-bold text-primary">
                  {formatNumber(stats.totalCopies)}
                </span>
              </a>
            </li>
          </ul>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
          <header className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-extrabold text-foreground">{m.tableTitle}</h3>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-120 text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-start text-xs font-bold text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 text-start font-bold">
                    #
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-start font-bold">
                    {m.incomeType}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-start font-bold">
                    {m.incomeStats}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-start font-bold">
                    {m.incomePercent}
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
      </div>

      <DataTable
        rows={stats.rows}
        title={m.monthsTable}
        keyOf={(row) => row.monthKey}
        searchText={(row) => row.month}
        labels={t.dataTable}
        rowNumberSuffix="."
        empty={m.noData}
        columns={[
          {
            header: m.month,
            cell: (row) => (
              <span className="text-sm font-bold text-foreground">{row.month}</span>
            ),
          },
          {
            header: m.copy,
            cell: (row) => (
              <span className="text-sm tabular-nums text-foreground">{formatCurrency(row.copy)}</span>
            ),
          },
          {
            header: m.hobani,
            cell: (row) => (
              <span className="text-sm tabular-nums text-foreground">{formatCurrency(row.hobani)}</span>
            ),
          },
          {
            header: m.sales,
            cell: (row) => (
              <span className="text-sm tabular-nums text-foreground">{formatCurrency(row.sales)}</span>
            ),
          },
          {
            header: m.wallet,
            cell: (row) => (
              <span className="text-sm tabular-nums text-foreground">{formatCurrency(row.wallet)}</span>
            ),
          },
          {
            header: m.total,
            cell: (row) => (
              <span className="text-sm font-bold tabular-nums text-primary">
                {formatCurrency(row.total)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

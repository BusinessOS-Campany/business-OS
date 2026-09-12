"use client";

import dynamic from "next/dynamic";
import { ShoppingBag } from "lucide-react";
import type { TotalSalesStats } from "@/lib/sales/totals";
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

interface TotalSalesViewProps {
  initialStats: TotalSalesStats;
}

const DONUT_COLORS = [
  "var(--primary)",
  "var(--warning)",
  "var(--destructive)",
  "var(--success)",
];

const BAR_CLASSES = ["bg-primary", "bg-warning", "bg-destructive", "bg-success"];

export function TotalSalesView({ initialStats }: TotalSalesViewProps) {
  const { t } = useLocale();
  const stats = initialStats;
  const s = t.totalSales;

  const donutRows = [
    { key: "copy" as const, label: s.copy, value: stats.copy, percent: stats.copyPercent },
    { key: "hobani" as const, label: s.hobani, value: stats.hobani, percent: stats.hobaniPercent },
    { key: "sales" as const, label: s.sales, value: stats.sales, percent: stats.salesPercent },
    { key: "wallet" as const, label: s.wallet, value: stats.wallet, percent: stats.walletPercent },
  ];

  const donutData = donutRows.filter((row) => row.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-extrabold text-foreground">{s.countStats}</h3>
          <div className="relative h-56">
            <DonutChart
              data={donutData.map((entry) => ({ name: entry.label, value: entry.value }))}
              colors={DONUT_COLORS}
              tooltipFormatter={(value) => formatCurrency(value)}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">{s.total}</span>
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
                <span className="text-muted-foreground">{s.totalCopies}</span>
                <span className="text-xs font-bold text-primary">
                  {formatNumber(stats.totalCopies)}
                </span>
              </a>
            </li>
          </ul>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
          <header className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-extrabold text-foreground">{s.tableTitle}</h3>
          </header>
          {stats.groups.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">{s.noData}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-120 text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-start text-xs font-bold text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 text-start font-bold">
                      #
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-start font-bold">
                      {s.incomeType}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-start font-bold">
                      {s.incomeStats}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-start font-bold">
                      {s.incomePercent}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.groups.map((group, groupIndex) =>
                    group.products.map((product, index) => (
                      <tr
                        key={product.productId}
                        className="border-b border-border/60 last:border-b-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                          {index + 1}.
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-bold text-foreground">{product.name}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {group.category}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex max-w-64 items-center gap-2">
                            <div className="h-2 w-full min-w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  BAR_CLASSES[groupIndex % BAR_CLASSES.length],
                                )}
                                style={{ width: `${product.percent}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {formatCurrency(product.income)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold",
                              "bg-primary/15 text-primary",
                            )}
                          >
                            {product.percent}%
                          </span>
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <DataTable
        rows={stats.soldProducts}
        title={
          <>
            <ShoppingBag className="mb-0.5 inline size-4 text-muted-foreground" aria-hidden="true" />
            {s.soldProducts}
          </>
        }
        keyOf={(row) => row.productId}
        searchText={(row) => row.name}
        labels={t.dataTable}
        empty={s.noSales}
        minWidth="min-w-120"
        columns={[
          {
            header: s.productName,
            cell: (row) => (
              <span className="text-sm font-bold text-foreground">{row.name}</span>
            ),
          },
          {
            header: s.quantity,
            cell: (row) => (
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatNumber(row.quantity)}
              </span>
            ),
          },
          {
            header: s.amount,
            cell: (row) => (
              <span className="text-sm font-bold tabular-nums text-primary">
                {formatCurrency(row.income)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

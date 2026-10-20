"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalesPoint } from "@/lib/dashboard/stats";
import { useLocale } from "@/lib/i18n/locale-provider";

interface SalesChartProps {
  data: SalesPoint[];
}

export function SalesChart({ data }: SalesChartProps) {
  const { locale, t } = useLocale();

  function formatDay(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "numeric",
    });
  }

  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
        {t.dashboard.salesChart.empty}
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={formatDay}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={46}
          />
          <Tooltip
            labelFormatter={(label) => formatDay(String(label))}
            formatter={(value) => [Number(value).toLocaleString("en-US"), t.dashboard.salesChart.tooltip]}
            contentStyle={{
              borderRadius: "0.5rem",
              border: "1px solid var(--border)",
              fontSize: "0.75rem",
              direction: locale === "ar" ? "rtl" : "ltr",
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--primary)"
            strokeWidth={3}
            fill="url(#salesFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

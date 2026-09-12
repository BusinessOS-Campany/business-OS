"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyRevenuePoint } from "@/lib/dashboard/stats";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-provider";
import { AR_MONTHS } from "@/lib/i18n/dictionaries";

interface RevenueBarChartProps {
  data: MonthlyRevenuePoint[];
}

export function RevenueBarChart({ data }: RevenueBarChartProps) {
  const { t } = useLocale();

  return (
    <div className="h-[250px] w-full py-2" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(value: string) => {
              const index = AR_MONTHS.indexOf(value);
              return index >= 0 ? t.dashboard.date.months[index] : value;
            }}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(value: number) => formatNumber(value)}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ fill: "rgba(13, 148, 136, 0.08)" }}
            formatter={(value) => [formatCurrency(Number(value)), t.dashboard.revenueChart.tooltip]}
            labelFormatter={(label) => {
              const index = AR_MONTHS.indexOf(String(label));
              return index >= 0 ? t.dashboard.date.months[index] : String(label);
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            contentStyle={{ borderRadius: 12, borderColor: "var(--border)", fontSize: 13 }}
          />
          <Bar dataKey="net" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={46} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

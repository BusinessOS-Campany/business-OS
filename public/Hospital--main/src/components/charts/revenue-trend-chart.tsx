"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useChartColors } from "@/components/charts/chart-colors";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: { label: string; revenue: number }[];
  height?: number;
}

export function RevenueTrendChart({ data, height = 260 }: Props) {
  const colors = useChartColors();

  return (
    <div dir="ltr" style={{ height }} className="w-full">
      {colors ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.chart1} stopOpacity={0.35} />
                <stop offset="100%" stopColor={colors.chart1} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: colors.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={4}
            />
            <YAxis
              tick={{ fill: colors.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={46}
              tickFormatter={(v: number) => compact(v)}
            />
            <Tooltip
              cursor={{ stroke: colors.axis, strokeDasharray: "4 4" }}
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 8,
                color: colors.tooltipText,
                fontSize: 12,
              }}
              formatter={(value: number | string | Array<number | string>) =>
                formatCurrency(Number(value))
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={colors.chart1}
              strokeWidth={2}
              fill="url(#revGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full animate-pulse rounded-md bg-muted/40" />
      )}
    </div>
  );
}

function compact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${Math.round(v / 1_000_000)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}
"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useChartColors } from "@/components/charts/chart-colors";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: { name: string; total: number }[];
  height?: number;
  color?: string;
}

export function DeptBarChart({ data, height = 220, color }: Props) {
  const colors = useChartColors();

  return (
    <div dir="ltr" style={{ height }} className="w-full">
      {colors ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: colors.axis, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              dy={4}
            />
            <YAxis
              tick={{ fill: colors.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v: number) => compact(v)}
            />
            <Tooltip
              cursor={{ fill: "rgba(128,128,128,0.08)" }}
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
            <Bar dataKey="total" fill={color ?? colors.chart2} radius={[4, 4, 0, 0]} maxBarSize={42} />
          </BarChart>
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
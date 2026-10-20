"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useChartColors } from "@/components/charts/chart-colors";

interface Props {
  data: { name: string; value: number; color?: string }[];
  centerLabel?: string;
  centerSub?: string;
}

export function DonutChartWidget({ data, centerLabel, centerSub }: Props) {
  const colors = useChartColors();
  const chartColors =
    colors && [colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5];

  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {colors && (
            <Tooltip
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 8,
                color: colors.tooltipText,
                fontSize: 12,
              }}
              formatter={(value: number | string | Array<number | string>) => String(value)}
            />
          )}
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="92%"
            paddingAngle={2}
            strokeWidth={0}
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? chartColors?.[i % 5] ?? "var(--chart-1)"}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerSub) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold leading-none tracking-tight">{centerLabel}</p>
          {centerSub && (
            <p className="mt-1 text-[11px] text-muted-foreground">{centerSub}</p>
          )}
        </div>
      )}
    </div>
  );
}
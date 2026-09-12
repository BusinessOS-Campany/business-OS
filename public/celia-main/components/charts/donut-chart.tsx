"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutDatum {
  name: string;
  value: number;
}

interface DonutChartProps {
  data: DonutDatum[];
  colors: string[];
  tooltipFormatter?: (value: number) => string;
}

const TOOLTIP_STYLE = {
  borderRadius: 12,
  borderColor: "var(--border)",
  fontSize: 13,
  backgroundColor: "var(--card)",
  color: "var(--foreground)",
};

export function DonutChart({ data, colors, tooltipFormatter }: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={56}
          outerRadius={86}
          paddingAngle={3}
          stroke="var(--card)"
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) =>
            tooltipFormatter ? tooltipFormatter(Number(value)) : Number(value)
          }
          contentStyle={TOOLTIP_STYLE}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

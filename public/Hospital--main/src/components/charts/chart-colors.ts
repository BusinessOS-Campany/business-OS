"use client";

import { useEffect, useState } from "react";

export interface ChartColors {
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

export function useChartColors(): ChartColors | null {
  const [colors, setColors] = useState<ChartColors | null>(null);

  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const pick = (name: string, fallback: string) => {
        const v = cs.getPropertyValue(name).trim();
        return v || fallback;
      };
      setColors({
        chart1: pick("--chart-1", "hsl(180 55% 34%)"),
        chart2: pick("--chart-2", "hsl(199 89% 44%)"),
        chart3: pick("--chart-3", "hsl(262 83% 58%)"),
        chart4: pick("--chart-4", "hsl(38 92% 50%)"),
        chart5: pick("--chart-5", "hsl(327 73% 53%)"),
        grid: pick("--border", "rgba(128,128,128,0.2)"),
        axis: pick("--muted-foreground", "hsl(215 14% 44%)"),
        tooltipBg: "hsl(var(--popover))",
        tooltipBorder: "hsl(var(--border))",
        tooltipText: "hsl(var(--popover-foreground))",
      });
    };
    read();
    // re-read when theme changes
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}
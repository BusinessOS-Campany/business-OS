"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLang } from "@/i18n/LanguageProvider";

interface Point {
  label: string;
  sales: number;
  profit: number;
}

export function SalesTrendChart({ data, height = 260 }: { data: Point[]; height?: number }) {
  const { lang } = useLang();
  const fmt = (v: number) =>
    new Intl.NumberFormat(lang === "ar" ? "ar-YE" : "en", { maximumFractionDigits: 0 }).format(v);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={fmt}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <Tooltip
          labelClassName="text-sm font-semibold"
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--popover)",
            color: "var(--foreground)",
            fontSize: 13,
          }}
          formatter={(value) => [fmt(Number(value)), ""]}
        />
        <Area type="monotone" dataKey="sales" stroke="#059669" strokeWidth={2} fill="url(#salesFill)" name="Sales" />
        <Area type="monotone" dataKey="profit" stroke="#0ea5e9" strokeWidth={2} fill="url(#profitFill)" name="Profit" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
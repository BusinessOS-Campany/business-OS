"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReportSummary {
  periodDays: number;
  sales: { invoices: number; total: number; paidTotal: number };
  profit: { revenue: number; cogs: number; grossProfit: number };
  inventory: { totalValue: number; lowStock: number };
  debt: { totalReceivable: number; customers: number };
  cashflow: { inflow: number; outflow: number; net: number };
}

interface MeData {
  user: { name: string | null; email: string };
  org: { name: string };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatMoney(amount: number): string {
  const riyals = amount / 100;
  return riyals.toLocaleString("ar-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " ر.س";
}

function arabicDate(): string {
  return new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  KPI Card                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("rounded-lg p-2", iconColor)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{value}</div>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {trend === "up" && (
            <ArrowUpRight className="h-3 w-3 text-primary" />
          )}
          {trend === "down" && (
            <ArrowDownRight className="h-3 w-3 text-red-400" />
          )}
          {trendLabel && (
            <span
              className={cn(
                trend === "up" && "text-primary",
                trend === "down" && "text-red-400",
                trend === "neutral" && "text-muted-foreground"
              )}
            >
              {trendLabel}
            </span>
          )}
          {subtitle && !trendLabel && (
            <span className="text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom Chart Tooltip                                               */
/* ------------------------------------------------------------------ */

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-card-foreground">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {formatMoney(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */

export default function TenantDashboard() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [summaryRes, meRes] = await Promise.all([
          fetch("/api/v1/reports/summary?days=30"),
          fetch("/api/v1/me"),
        ]);

        const summaryJson = await summaryRes.json();
        const meJson = await meRes.json();

        if (summaryJson.ok) setSummary(summaryJson.data);
        if (meJson.ok) setMe(meJson.data);
      } catch {
        setError("فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Activity className="h-5 w-5 animate-pulse text-primary" />
          <span className="text-sm">جاري تحميل لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Card className="max-w-sm text-center">
          <CardContent className="pt-6">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
            <p className="mt-4 text-sm text-card-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userName = me?.user?.name ?? me?.user?.email ?? "";
  const orgName = me?.org?.name ?? "";

  const salesData = summary?.sales ?? { invoices: 0, total: 0, paidTotal: 0 };
  const profitData = summary?.profit ?? { revenue: 0, cogs: 0, grossProfit: 0 };
  const inventoryData = summary?.inventory ?? { totalValue: 0, lowStock: 0 };
  const debtData = summary?.debt ?? { totalReceivable: 0, customers: 0 };
  const cashflowData = summary?.cashflow ?? { inflow: 0, outflow: 0, net: 0 };
  const periodDays = summary?.periodDays ?? 30;

  /* Chart data */
  const salesProfitChart = [
    {
      name: "المبيعات",
      المبيعات: salesData.total,
      الربح: profitData.grossProfit,
    },
  ];

  const cashflowChart = [
    {
      name: "التدفقات",
      الوارد: cashflowData.inflow,
      الصادر: cashflowData.outflow,
    },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      {/* ---- Welcome Banner ---- */}
      <Card className="border-primary/20 bg-gradient-to-l from-primary/10 to-background dark:from-primary/10 dark:to-background">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                مرحباً، {userName}
              </h1>
              {orgName && (
                <p className="mt-1 text-sm text-muted-foreground">{orgName}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{arabicDate()}</span>
            </div>
          </div>
          <div className="mt-3">
            <Badge variant="secondary" className="text-xs">
              آخر {periodDays} يوم
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ---- KPI Cards ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="المبيعات"
          value={formatMoney(salesData.total)}
          subtitle={`${salesData.invoices} فاتورة`}
          icon={TrendingUp}
          iconColor="bg-primary"
          trend="up"
          trendLabel={`${salesData.invoices} فاتورة`}
        />
        <KpiCard
          title="الربح"
          value={formatMoney(profitData.grossProfit)}
          subtitle={`الإيراد: ${formatMoney(profitData.revenue)}`}
          icon={DollarSign}
          iconColor="bg-primary/80"
          trend={profitData.grossProfit >= 0 ? "up" : "down"}
          trendLabel={
            profitData.revenue > 0
              ? `${((profitData.grossProfit / profitData.revenue) * 100).toFixed(1)}%`
              : undefined
          }
        />
        <KpiCard
          title="قيمة المخزون"
          value={formatMoney(inventoryData.totalValue)}
          icon={Package}
          iconColor="bg-neutral-600"
          trend="neutral"
          trendLabel={`${inventoryData.lowStock} منخفض`}
        />
        <KpiCard
          title="الديون المدينة"
          value={formatMoney(debtData.totalReceivable)}
          subtitle={`${debtData.customers} عميل`}
          icon={AlertTriangle}
          iconColor="bg-amber-600"
          trend={debtData.totalReceivable > 0 ? "down" : "neutral"}
          trendLabel={`${debtData.customers} عميل`}
        />
      </div>

      {/* ---- Charts ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sales vs Profit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-card-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              المبيعات مقابل الربح — {periodDays} يوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesProfitChart} layout="vertical" barGap={4}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#262626"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "#737373", fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      (v / 100).toLocaleString("ar-SA")
                    }
                    axisLine={{ stroke: "#404040" }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: "#a3a3a3", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Legend
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12, color: "#a3a3a3" }}
                  />
                  <Bar
                    dataKey="المبيعات"
                    fill="#03EABC"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="الربح"
                    fill="#0263D1"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cash Inflow vs Outflow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-card-foreground">
              <Activity className="h-4 w-4 text-primary" />
              التدفقات النقدية — {periodDays} يوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowChart} layout="vertical" barGap={4}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#262626"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "#737373", fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      (v / 100).toLocaleString("ar-SA")
                    }
                    axisLine={{ stroke: "#404040" }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: "#a3a3a3", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Legend
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12, color: "#a3a3a3" }}
                  />
                  <Bar
                    dataKey="الوارد"
                    fill="#03EABC"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="الصادر"
                    fill="#525252"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Net cashflow badge */}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">صافي التدفق</span>
              <Badge
                variant={
                  cashflowData.net >= 0 ? "success" : "destructive"
                }
              >
                {cashflowData.net >= 0 ? "▲" : "▼"}{" "}
                {formatMoney(Math.abs(cashflowData.net))}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- Quick Stats ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Low Stock */}
        <Card className="group relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-card-foreground">
              <Package className="h-4 w-4 text-amber-400" />
              تنبيه المخزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-amber-400">
                  {inventoryData.lowStock}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  منتج بكمية منخفضة
                </p>
              </div>
              <Link
                href="/app/inventory"
                className="flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary/80"
              >
                عرض المخزون
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-l from-amber-500/40 to-transparent" />
        </Card>

        {/* Pending Debt */}
        <Card className="group relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-card-foreground">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              الديون المستحقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-red-400">
                  {formatMoney(debtData.totalReceivable)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  من {debtData.customers} عميل
                </p>
              </div>
              <Link
                href="/app/customers"
                className="flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary/80"
              >
                عرض العملاء
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-l from-red-500/40 to-transparent" />
        </Card>
      </div>
    </div>
  );
}

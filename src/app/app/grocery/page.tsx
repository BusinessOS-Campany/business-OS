"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
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
  ShoppingCart,
  Activity,
  CalendarDays,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardData {
  orgName: string;
  kpis: {
    todaySales: number;
    todayProfit: number;
    lowStockCount: number;
    customerDebt: number;
  };
  salesTrend: Array<{ day: string; sales: number }>;
  topProducts: Array<{
    id: string;
    name: string;
    sold: number;
    revenue: number;
  }>;
  recentSales: Array<{
    id: string;
    invoiceNo: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  lowStock: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
  }>;
}

function formatMoney(amount: number): string {
  const riyals = amount / 100;
  return (
    riyals.toLocaleString("ar-SA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " ر.س"
  );
}

function arabicDate(): string {
  return new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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

export default function GroceryDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/v1/grocery/dashboard");
        const json = await res.json();
        if (json.ok) {
          setData(json.data);
        } else {
          setError("فشل تحميل البيانات");
        }
      } catch {
        setError("فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
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

  const kpis = data?.kpis ?? {
    todaySales: 0,
    todayProfit: 0,
    lowStockCount: 0,
    customerDebt: 0,
  };
  const salesTrend = data?.salesTrend ?? [];
  const topProducts = data?.topProducts ?? [];
  const recentSales = data?.recentSales ?? [];
  const lowStock = data?.lowStock ?? [];

  return (
    <div dir="rtl" className="space-y-6">
      {/* Welcome Banner */}
      <Card className="border-primary/20 bg-gradient-to-l from-primary/10 to-background dark:from-primary/10 dark:to-background">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                مرحباً بكم في البقالة
              </h1>
              {data?.orgName && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.orgName}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{arabicDate()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="مبيعات اليوم"
          value={formatMoney(kpis.todaySales)}
          icon={ShoppingCart}
          iconColor="bg-primary"
          trend="up"
          trendLabel="اليوم"
        />
        <KpiCard
          title="ربح اليوم"
          value={formatMoney(kpis.todayProfit)}
          icon={DollarSign}
          iconColor="bg-primary/80"
          trend={kpis.todayProfit >= 0 ? "up" : "down"}
        />
        <KpiCard
          title="مخزون منخفض"
          value={String(kpis.lowStockCount)}
          subtitle="منتج"
          icon={Package}
          iconColor="bg-amber-600"
          trend={kpis.lowStockCount > 0 ? "down" : "neutral"}
          trendLabel={`${kpis.lowStockCount} منتج`}
        />
        <KpiCard
          title="ديون العملاء"
          value={formatMoney(kpis.customerDebt)}
          icon={AlertTriangle}
          iconColor="bg-red-600"
          trend={kpis.customerDebt > 0 ? "down" : "neutral"}
        />
      </div>

      {/* Charts + Tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sales Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-card-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              اتجاه المبيعات — آخر 7 أيام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#262626"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#737373", fontSize: 11 }}
                    axisLine={{ stroke: "#404040" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#737373", fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      (v / 100).toLocaleString("ar-SA")
                    }
                    axisLine={{ stroke: "#404040" }}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: "rgba(3,234,188,0.2)" }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, color: "#a3a3a3" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    name="المبيعات"
                    stroke="#03EABC"
                    strokeWidth={2}
                    dot={{ fill: "#03EABC", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-card-foreground">
              <Package className="h-4 w-4 text-amber-400" />
              تنبيه المخزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                لا يوجد منتجات منخفضة المخزون
              </p>
            ) : (
              <div className="space-y-3">
                {lowStock.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-card-foreground">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        الحد الأدنى: {item.minStock}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {item.currentStock}
                    </Badge>
                  </div>
                ))}
                {lowStock.length > 6 && (
                  <Link
                    href="/app/grocery/inventory"
                    className="flex items-center justify-center gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    عرض الكل
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-card-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              الأكثر مبيعاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                لا توجد بيانات بعد
              </p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-card-foreground">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.sold} مبيعة
                      </p>
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {formatMoney(p.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-card-foreground">
              <ReceiptText className="h-4 w-4 text-primary" />
              آخر المبيعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                لا توجد مبيعات بعد
              </p>
            ) : (
              <div className="space-y-2">
                {recentSales.slice(0, 6).map((sale) => (
                  <Link
                    key={sale.id}
                    href={`/app/grocery/sales?id=${sale.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-card-foreground">
                        {sale.customerName || "عميل نقدي"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.invoiceNo} —{" "}
                        {new Date(sale.createdAt).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-primary">
                        {formatMoney(sale.total)}
                      </p>
                      <Badge
                        variant={
                          sale.status === "paid" ? "success" : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {sale.status === "paid" ? "مدفوع" : "معلق"}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {recentSales.length > 6 && (
                  <Link
                    href="/app/grocery/sales"
                    className="flex items-center justify-center gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    عرض الكل
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/provider";
import { Package, ShoppingBag, DollarSign, Wallet, TrendingUp, Star, AlertCircle, Calendar, ArrowUp } from "lucide-react";

interface BestSellingProduct {
  id: string;
  name: string;
  nameEn: string | null;
  images: string[];
  totalSold: number;
  revenue: number;
}

interface SalesDay {
  date: string;
  orders: number;
  revenue: number;
}

interface Stats {
  totalProducts: number;
  publishedProducts: number;
  lowStock: number;
  totalOrders: number;
  newOrdersToday: number;
  newOrdersThisMonth: number;
  totalRevenue: number;
  revenueToday: number;
  revenueThisMonth: number;
  bestSelling: BestSellingProduct[];
  salesByDay: SalesDay[];
  feesTotal: number;
  withdrawableBalance: number;
}

export default function MerchantDashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/merchant/stats")
      .then((r) => {
        if (!r.ok) throw new Error(t("common.error"));
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError(t("merchant.stats_error"));
        setLoading(false);
      });
  }, [t]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="h-64 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="h-64 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-12 w-12 mb-4 text-red-500" />
            <p className="text-lg">{error || t("merchant.stats_error")}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              {t("merchant.retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxOrders = Math.max(...stats.salesByDay.map((d) => d.orders), 1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("merchant.title")}</h1>
        <Link href="/merchant/products/new">
          <Button><ArrowUp className="ms-2 h-4 w-4 rotate-45" />{t("merchant.add_product")}</Button>
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("merchant.total_products")}</CardTitle>
            <Package className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("merchant.new_orders_today")}</CardTitle>
            <ShoppingBag className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.newOrdersToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("merchant.revenue_today")}</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{Number(stats.revenueToday).toFixed(0)} {t("merchant.currency")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("merchant.withdrawable_balance")}</CardTitle>
            <Wallet className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{Number(stats.withdrawableBalance).toFixed(0)} {t("merchant.currency")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                {t("merchant.best_selling")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.bestSelling.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t("merchant.no_sales")}</p>
              ) : (
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-12 gap-2 pb-2 text-xs font-medium text-muted-foreground">
                    <div className="col-span-6">{t("merchant.product")}</div>
                    <div className="col-span-3 text-center">{t("merchant.sold")}</div>
                    <div className="col-span-3 text-end">{t("merchant.revenue")}</div>
                  </div>
                  {stats.bestSelling.map((product, i) => (
                    <div key={product.id} className="grid grid-cols-12 gap-2 py-3 items-center">
                      <div className="col-span-6 flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                        <div className="h-10 w-10 rounded-lg border border-border bg-muted overflow-hidden flex-shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 m-auto text-muted-foreground/40" />
                          )}
                        </div>
                        <span className="text-sm font-medium truncate">{product.name}</span>
                      </div>
                      <div className="col-span-3 text-center text-sm">{product.totalSold}</div>
                      <div className="col-span-3 text-end text-sm font-medium">
                        {Number(product.revenue).toFixed(0)} {t("merchant.currency")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("merchant.total_revenue")}</CardTitle>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{Number(stats.totalRevenue).toFixed(0)} {t("merchant.currency")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("merchant.platform_fees")}</CardTitle>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-muted-foreground">{Number(stats.feesTotal).toFixed(0)} {t("merchant.currency")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("merchant.monthly_orders")}</CardTitle>
              <Calendar className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.newOrdersThisMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("merchant.low_stock")}</CardTitle>
              <AlertCircle className={`h-5 w-5 ${stats.lowStock > 0 ? "text-red-500" : "text-green-500"}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats.lowStock > 0 ? "text-red-500" : ""}`}>{stats.lowStock}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t("merchant.daily_sales")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.salesByDay.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("merchant.no_sales_data")}</p>
          ) : (
            <div className="space-y-4">
              {stats.salesByDay.map((day) => {
                const dateStr = new Date(day.date).toLocaleDateString("ar-SA", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                const widthPct = maxOrders > 0 ? (day.orders / maxOrders) * 100 : 0;
                return (
                  <div key={day.date} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3 text-sm text-muted-foreground">{dateStr}</div>
                    <div className="col-span-6 flex items-center gap-2">
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-6 text-center">{day.orders}</span>
                    </div>
                    <div className="col-span-3 text-end text-sm font-medium">
                      {Number(day.revenue).toFixed(0)} {t("merchant.currency")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

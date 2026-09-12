import { prisma } from "@/lib/prisma";
import { DollarSign, ShoppingCart, Users, Star, TrendingUp, Package } from "lucide-react";
import { T } from "@/components/translate";
import { getServerTranslations } from "@/lib/i18n/server";

export default async function AnalyticsPage() {
  const { t } = await getServerTranslations();
  let totalOrders = 0;
  let totalRevenue: any = { _sum: { total: 0 } };
  let totalProducts = 0;
  let totalCustomers = 0;
  let totalReviews = 0;
  let recentOrders: any[] = [];
  try {
    [totalOrders, totalRevenue, totalProducts, totalCustomers, totalReviews, recentOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
      prisma.product.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.review.count(),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { items: { include: { product: { select: { name: true, nameEn: true } } } } } }),
    ]);
  } catch {}

  const revenue = Number(totalRevenue._sum.total || 0);
  const recentOrdersPlain = recentOrders.map(o => ({
    ...o,
    total: Number(o.total),
    items: o.items.map((i: any) => ({ ...i, price: Number(i.price) })),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold"><T k="admin.analytics" /></h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label={t("admin.total_revenue")} value={`${(revenue).toLocaleString()} ${t("admin.currency_rial")}`} color="text-green-600" />
        <StatCard icon={ShoppingCart} label={t("admin.total_orders")} value={totalOrders.toString()} color="text-blue-600" />
        <StatCard icon={Package} label={t("admin.products")} value={totalProducts.toString()} color="text-orange-600" />
        <StatCard icon={Users} label={t("admin.customers")} value={totalCustomers.toString()} color="text-purple-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        <StatCard icon={TrendingUp} label={t("admin.avg_order_value")} value={`${totalOrders > 0 ? Math.round(revenue / totalOrders).toLocaleString() : 0} ${t("admin.currency_rial")}`} color="text-cyan-600" />
        <StatCard icon={Star} label={t("admin.reviews")} value={totalReviews.toString()} color="text-yellow-600" />
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4"><T k="admin.recent_orders" /></h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr><th className="text-start p-3">{t("admin.customer")}</th><th className="text-start p-3">{t("admin.products")}</th><th className="text-start p-3">{t("admin.amount")}</th><th className="text-start p-3">{t("admin.status")}</th><th className="text-start p-3">{t("admin.date")}</th></tr>
            </thead>
            <tbody>
              {recentOrdersPlain.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3">{o.customerName}</td>
                  <td className="p-3">{o.items.map((i: any) => i.product?.name || i.product?.nameEn || "").join(", ").slice(0, 40)}</td>
                  <td className="p-3 font-semibold">{o.total.toLocaleString()} {t("admin.currency_rial")}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${o.status === "DELIVERED" ? "bg-green-100 text-green-700" : o.status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{t(`orders.status_${o.status}`)}</span></td>
                  <td className="p-3 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={`h-4 w-4 ${color}`} />
        {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

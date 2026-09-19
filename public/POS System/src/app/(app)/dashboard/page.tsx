import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Receipt,
  PackageX,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Timer,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/server/session";
import { formatMoney, formatQty, serialize, b2n } from "@/lib/format";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { StatusBadge } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function DashboardPage() {
  const tenant = await getTenant();
  const { companyId, branchId, currency, permissions, isSuperAdmin } = tenant;

  const today = startOfToday();
  const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
  const thirtyDaysAgo = new Date(today.getTime() - 29 * 86400000);

  const branchWhere = branchId ? { branchId } : {};

  interface InventoryRow {
  quantity: bigint;
  product: { id: string; nameAr: string; nameEn: string; minStock: unknown; reorderLevel: unknown };
}

  const [todayAgg, trendSales, paymentBreakdown, _topSales, recentSales, lowStockRows] = await Promise.all([
    prisma.sale.aggregate({
      where: { companyId, status: "COMPLETED", createdAt: { gte: today }, ...branchWhere },
      _sum: { total: true, profit: true },
      _count: { _all: true },
    }),
    prisma.sale.findMany({
      where: { companyId, status: "COMPLETED", createdAt: { gte: sevenDaysAgo }, ...branchWhere },
      select: { createdAt: true, total: true, profit: true },
    }),
    prisma.salePayment.groupBy({
      by: ["methodNameEn"],
      where: { sale: { companyId, status: "COMPLETED", createdAt: { gte: today }, ...branchWhere } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: { companyId, type: "POS", status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 6,
    }),
    prisma.sale.findMany({
      where: { companyId, ...branchWhere },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        customer: { select: { name: true, nameAr: true } },
        cashier: { select: { name: true } },
      },
    }),
    branchId
      ? (prisma.inventory.findMany({
          where: { companyId, warehouse: { branches: { some: { id: branchId } } } },
          include: {
            product: { select: { id: true, nameAr: true, nameEn: true, minStock: true, reorderLevel: true } },
          },
        }) as unknown as Promise<InventoryRow[]>)
      : Promise.resolve([]),
  ]);

  const totalToday = todayAgg._sum.total ?? 0n;
  const profitToday = todayAgg._sum.profit ?? 0n;
  const orderCount = todayAgg._count._all;
  const avgOrder = orderCount > 0 ? b2n(totalToday) / orderCount : 0;

  // Trend buckets (last 7 days)
  const buckets: Record<string, { sales: number; profit: number; label: string }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() - (6 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = {
      sales: 0,
      profit: 0,
      label: tenant.user.language === "ar"
        ? d.toLocaleDateString("ar", { weekday: "short" })
        : d.toLocaleDateString("en", { weekday: "short" }),
    };
  }
  for (const s of trendSales) {
    const key = s.createdAt.toISOString().slice(0, 10);
    if (buckets[key]) {
      buckets[key].sales += b2n(s.total);
      buckets[key].profit += b2n(s.profit);
    }
  }
  const trend = Object.values(buckets).map((b) => ({
    ...b,
    sales: Math.round(b.sales / 100),
    profit: Math.round(b.profit / 100),
  }));

  const paymentData = paymentBreakdown.map((p) => ({
    name: tenant.user.language === "ar" ? (p.methodNameEn === "Cash" ? "نقدي" : p.methodNameEn) : p.methodNameEn,
    value: Math.round(b2n(p._sum.amount ?? 0n) / 100),
  }));

  // Low stock
  const lowStock = lowStockRows
    .map((r) => {
      const minStock = Number(String(r.product.minStock));
      const reorderVal = Number(String(r.product.reorderLevel ?? 0));
      const threshold = minStock > 0 ? minStock : reorderVal > 0 ? reorderVal : 5;
      return {
        productId: r.product.id,
        name: tenant.user.language === "ar" ? r.product.nameAr || r.product.nameEn : r.product.nameEn || r.product.nameAr,
        qty: b2n(r.quantity),
        threshold,
      };
    })
    .filter((r) => r.qty <= r.threshold)
    .sort((a, b) => a.qty - b.qty)
    .slice(0, 6);

  const canSell = isSuperAdmin || permissions.has("sale.create");

  const recent = serialize(recentSales) as {
    id: string;
    invoiceNo: string;
    total: number;
    status: string;
    createdAt: string;
    customer: { name: string; nameAr: string } | null;
    cashier: { name: string };
  }[];

  const statusKey = (s: string) =>
    ({ COMPLETED: "sales.completed", CANCELLED: "sales.cancelled", HELD: "sales.held", REFUNDED: "sales.refView" } as Record<string, string>)[s] ?? "sales.completed";

  return (
    <div className="space-y-6">
      {/* Page intro */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">
            {tenant.user.language === "ar" ? `مرحباً، ${tenant.user.name.split(" ")[0]}` : `Hello, ${tenant.user.name.split(" ")[0]}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(tenant.user.language === "ar" ? "ar" : "en", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canSell && (
            <Link
              href="/pos"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              {tenant.user.language === "ar" ? "بيع جديد" : "New sale"}
            </Link>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={tenant.user.language === "ar" ? "مبيعات اليوم" : "Today's sales"}
          value={formatMoney(b2n(totalToday), currency, tenant.user.language)}
          icon={<Wallet className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label={tenant.user.language === "ar" ? "أرباح اليوم" : "Today's profit"}
          value={formatMoney(b2n(profitToday), currency, tenant.user.language)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          label={tenant.user.language === "ar" ? "الطلبات" : "Orders"}
          value={String(orderCount)}
          icon={<Receipt className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          label={tenant.user.language === "ar" ? "متوسط الطلب" : "Average order"}
          value={formatMoney(Math.round(avgOrder), currency, tenant.user.language)}
          icon={<Timer className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <CardTitle
            title={tenant.user.language === "ar" ? "المبيعات عبر الأسبوع" : "Sales over the last 7 days"}
            subtitle={tenant.user.language === "ar" ? "المبيعات والأرباح" : "Sales and profit"}
          />
          <SalesTrendChart data={trend} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <CardTitle
            title={tenant.user.language === "ar" ? "طرق الدفع" : "Payment methods"}
            subtitle={tenant.user.language === "ar" ? "مبيعات اليوم" : "Today's sales"}
          />
          {paymentData.length === 0 ? (
            <EmptyNote text={tenant.user.language === "ar" ? "لا توجد مبيعات اليوم" : "No sales today"} />
          ) : (
            <div className="mt-4 space-y-3">
              {paymentData.map((p) => (
                <div key={p.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{formatMoney(p.value, currency, tenant.user.language)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${Math.min(100, (p.value / Math.max(1, Math.max(...paymentData.map((x) => x.value)))) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock + recent sales */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <CardTitle
            title={tenant.user.language === "ar" ? "مخزون منخفض" : "Low stock"}
            subtitle={`${lowStock.length} ${tenant.user.language === "ar" ? "منتجات تحتاج طلباً" : "items need reordering"}`}
          />
          {lowStock.length === 0 ? (
            <EmptyNote text={tenant.user.language === "ar" ? "المخزون بحالة جيدة" : "Inventory looks healthy"} />
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {lowStock.map((p) => (
                <li key={p.productId} className="flex items-center justify-between py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="truncate text-sm font-medium">{p.name}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-destructive">{formatQty(p.qty, tenant.user.language, 0)}</span>
                    <Link href="/inventory" className="text-muted-foreground transition hover:text-foreground">
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <CardTitle title={tenant.user.language === "ar" ? "أحدث المبيعات" : "Recent sales"} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-start font-semibold">{tenant.user.language === "ar" ? "الفاتورة" : "Invoice"}</th>
                  <th className="px-3 py-2 text-start font-semibold">{tenant.user.language === "ar" ? "العميل" : "Customer"}</th>
                  <th className="px-3 py-2 text-start font-semibold">{tenant.user.language === "ar" ? "الكاشير" : "Cashier"}</th>
                  <th className="px-3 py-2 text-end font-semibold">{tenant.user.language === "ar" ? "الإجمالي" : "Total"}</th>
                  <th className="px-3 py-2 text-end font-semibold">{tenant.user.language === "ar" ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {tenant.user.language === "ar" ? "لا توجد مبيعات مسجلة" : "No sales recorded"}
                    </td>
                  </tr>
                ) : (
                  recent.map((s) => (
                    <tr key={s.id} className="transition hover:bg-muted/40">
                      <td className="px-3 py-2.5 font-medium">{s.invoiceNo}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {s.customer ? (tenant.user.language === "ar" ? s.customer.nameAr || s.customer.name : s.customer.name) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{s.cashier.name}</td>
                      <td className="px-3 py-2.5 text-end font-semibold">{formatMoney(s.total, currency, tenant.user.language)}</td>
                      <td className="px-3 py-2.5 text-end">
                        <StatusBadge status={s.status} labelKey={statusKey(s.status)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "emerald" | "sky" | "violet" | "amber";
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-extrabold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h3 className="text-sm font-bold">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="flex h-full min-h-28 items-center justify-center text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <PackageX className="h-5 w-5" />
        {text}
      </span>
    </div>
  );
}
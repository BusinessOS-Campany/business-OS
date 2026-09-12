"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Package, DollarSign, ShoppingCart, Star, TrendingUp, ArrowLeft, Wallet, Percent, Calendar, Phone, Mail, MapPin, Globe, ExternalLink, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/provider";

type Store = {
  id: string; name: string | null; nameEn: string | null; slug: string | null;
  description: string | null; descriptionEn: string | null; logo: string | null;
  cover: string | null; phone: string | null; email: string | null;
  address: string | null; whatsapp: string | null; telegram: string | null;
  instagram: string | null; facebook: string | null; twitter: string | null;
  tiktok: string | null; createdAt: string;
};

type Product = {
  id: string; name: string; nameEn: string | null; slug: string; price: number;
  images: string[]; stock: number; discount: number; featured: boolean;
  createdAt: string; totalSold: number; revenue: number;
  avgRating: number; reviewCount: number; favoriteCount: number;
};

type MonthlySale = { month: string; orders: number; revenue: number };
type RecentOrder = { id: string; customerName: string; createdAt: string; total: number; items: { quantity: number; price: number; product: { name: string; nameEn: string | null } }[] };
type Withdrawal = { id: string; amount: number; fee: number; status: string; method: string | null; accountInfo: string | null; notes: string | null; createdAt: string };

type Data = {
  merchant: { id: string; name: string | null; email: string; image: string | null; points: number; referralCode: string | null; registeredAt: string };
  store: Store | null;
  stats: { totalProducts: number; totalReviews: number; totalOrders: number; totalRevenue: number; platformFees: number; withdrawnAmount: number; withdrawableBalance: number; totalWithdrawals: number };
  products: Product[];
  withdrawals: Withdrawal[];
  pendingWithdrawals: Withdrawal[];
  monthlySales: MonthlySale[];
  recentOrders: RecentOrder[];
};

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl lg:text-2xl font-bold ${color || ""}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className={`h-5 w-5 ${color || "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StoreField({ icon: Icon, label, value, href }: { icon: any; label: string; value: string | null; href?: string }) {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline">{content}</a>;
  return content;
}

function ProductRow({ p }: { p: Product }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
            {p.images[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : p.name[0]}
          </div>
          <span className="font-medium truncate max-w-[160px]">{p.name}</span>
        </div>
      </TableCell>
      <TableCell>{p.price.toLocaleString()}</TableCell>
      <TableCell><Badge variant={p.stock > 0 ? "success" : "danger"}>{p.stock}</Badge></TableCell>
      <TableCell>{p.totalSold}</TableCell>
      <TableCell className="text-green-600 font-medium">{p.revenue.toLocaleString()}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Star className={`h-3.5 w-3.5 ${p.avgRating > 0 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
          <span className="text-sm">{p.avgRating > 0 ? p.avgRating.toFixed(1) : "—"}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function MerchantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetch(`/api/admin/merchants/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!data) return <div className="text-center py-12 text-muted-foreground">{t("admin.failed_load")}</div>;

  const { merchant, store, stats, products, monthlySales, recentOrders } = data;
  const paginatedProducts = products.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(products.length / pageSize);
  const maxRevenue = Math.max(...monthlySales.map(m => m.revenue), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/merchants")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
            {merchant.name?.[0] || "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold">{merchant.name || t("admin.merchant")}</h1>
            <p className="text-sm text-muted-foreground">{merchant.email}</p>
          </div>
        </div>
        <Badge variant="outline" className="mr-auto">{t("admin.merchant")}</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={DollarSign} label={t("admin.total_revenue")} value={`${stats.totalRevenue.toLocaleString()} ${t("admin.currency_rial")}`} color="text-green-600" />
        <StatCard icon={ShoppingCart} label={t("admin.orders")} value={stats.totalOrders.toString()} color="text-blue-600" />
        <StatCard icon={Package} label={t("admin.products")} value={stats.totalProducts.toString()} color="text-orange-600" />
        <StatCard icon={Percent} label={t("admin.platform_fee")} value={`${stats.platformFees.toLocaleString()} ${t("admin.currency_rial")}`} color="text-red-600" />
        <StatCard icon={CreditCard} label={t("admin.withdrawals")} value={`${stats.withdrawnAmount.toLocaleString()} ${t("admin.currency_rial")}`} color="text-purple-600" />
        <StatCard icon={Wallet} label={t("admin.withdrawable_balance")} value={`${stats.withdrawableBalance.toLocaleString()} ${t("admin.currency_rial")}`} color="text-emerald-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Store className="h-5 w-5" />{t("admin.store")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {store ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <StoreField icon={Store} label={t("admin.category_name")} value={store.name || store.nameEn} />
                <StoreField icon={Globe} label={t("admin.slug")} value={store.slug || null} />
                <StoreField icon={Phone} label={t("admin.phone")} value={store.phone} />
                <StoreField icon={Mail} label={t("admin.email_label")} value={store.email} />
                <StoreField icon={MapPin} label={t("admin.address")} value={store.address} />
                <StoreField icon={Calendar} label={t("admin.registration_date")} value={new Date(merchant.registeredAt).toLocaleDateString("ar-SA")} />
                {store.whatsapp && <StoreField icon={ExternalLink} label={t("admin.whatsapp")} value={store.whatsapp} href={`https://wa.me/${store.whatsapp}`} />}
                {store.telegram && <StoreField icon={ExternalLink} label={t("admin.telegram")} value={store.telegram} />}
                {store.instagram && <StoreField icon={ExternalLink} label={t("admin.instagram")} value={store.instagram} />}
                {store.facebook && <StoreField icon={ExternalLink} label={t("admin.facebook")} value={store.facebook} />}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("admin.no_store_registered")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" />{t("admin.monthly_sales")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {monthlySales.map((m) => (
              <div key={m.month} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{m.month}</span>
                  <span className="font-medium">{m.revenue.toLocaleString()} {t("admin.currency_rial")}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(m.revenue / maxRevenue) * 100}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{m.orders} {t("admin.orders")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5" />{t("admin.products")} ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-md:hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.product_name")}</TableHead>
                  <TableHead>{t("admin.price")}</TableHead>
                  <TableHead>{t("admin.stock")}</TableHead>
                  <TableHead>{t("admin.sold")}</TableHead>
                  <TableHead>{t("admin.revenue")}</TableHead>
                  <TableHead>{t("admin.review_rating")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("admin.no_products")}</TableCell></TableRow>
                ) : paginatedProducts.map(p => <ProductRow key={p.id} p={p} />)}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-2">
            {paginatedProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">{t("admin.no_products")}</p>
            ) : paginatedProducts.map(p => (
              <Card key={p.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                      {p.images[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : p.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.price.toLocaleString()} {t("admin.currency_rial")}</p>
                    </div>
                    <Badge variant={p.stock > 0 ? "success" : "danger"}>{p.stock}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div><p className="font-medium">{p.totalSold}</p><p className="text-muted-foreground">{t("admin.sold")}</p></div>
                    <div><p className="font-medium text-green-600">{p.revenue.toLocaleString()}</p><p className="text-muted-foreground">{t("admin.currency_rial")}</p></div>
                    <div><p className="font-medium">{p.avgRating > 0 ? p.avgRating.toFixed(1) : "—"}</p><p className="text-muted-foreground">{t("admin.review_rating")}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronRight className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronLeft className="h-4 w-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><ShoppingCart className="h-5 w-5" />{t("admin.recent_orders")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-start p-3">{t("admin.customer")}</th>
                    <th className="text-start p-3">{t("admin.products")}</th>
                    <th className="text-start p-3">{t("admin.amount")}</th>
                    <th className="text-start p-3">{t("admin.date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="p-3">{o.customerName}</td>
                      <td className="p-3 text-muted-foreground">{o.items.map(i => i.product?.name || i.product?.nameEn || "").join(", ").slice(0, 40)}</td>
                      <td className="p-3 font-medium">{Number(o.total).toLocaleString()} {t("admin.currency_rial")}</td>
                      <td className="p-3 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ar-SA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

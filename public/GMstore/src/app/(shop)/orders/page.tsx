"use client";
import { useState } from "react";
import Link from "next/link";
import { Package, XCircle, Check, Search, Calendar, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";
import { T } from "@/components/translate";

const statusVariant: Record<string, "warning" | "success" | "danger" | "default"> = {
  PENDING: "warning", PROCESSING: "warning", SHIPPED: "warning", DELIVERED: "success", CANCELLED: "danger",
};

export default function MyOrdersPage() {
  const { t, locale, direction } = useI18n();
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      const last = localStorage.getItem("lastOrder");
      if (last) try { return JSON.parse(last).customerEmail; } catch {}
    }
    return "";
  });
  const [orders, setOrders] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function searchOrders(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/orders/by-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  }

  return (
    <div dir={direction} className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="text-center space-y-2">
        <ShoppingBag className="h-10 w-10 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">{t("orders.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("orders.description")}</p>
      </div>

      <form onSubmit={searchOrders} className="flex gap-3 max-w-md mx-auto">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("orders.email_placeholder")}
          required
        />
        <Button type="submit" loading={loading}><Search className="h-4 w-4 ml-2" />{t("orders.search")}</Button>
      </form>

      {searched && orders && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>{t("orders.no_orders")}</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          #{order.id.slice(0, 8)}
                        </span>
                        <Badge variant={statusVariant[order.status] || "default"}>
                          {order.status === "CANCELLED" && <XCircle className="h-3 w-3 ml-1" />}
                          {order.status === "DELIVERED" && <Check className="h-3 w-3 ml-1" />}
                          <T k={`track.status_${order.status}`} />
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(order.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-lg font-bold">{Number(order.total).toFixed(0)} {t("merchant.currency")}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {item.product?.images?.[0] ? (
                            <img src={item.product.images[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 m-auto text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product?.name || t("product.name_fallback")}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × {Number(item.price).toFixed(0)}
                            {item.color && <> · {item.color}</>}
                            {item.size && <> · {t("detail.sizes")} {item.size}</>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <Link href={`/track/${order.id}`}>
                      <Button variant="outline" size="sm">{t("orders.track")}</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

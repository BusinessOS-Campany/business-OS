"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/provider";
import { localizedName } from "@/lib/i18n/localized";

const statusColor: Record<string, "default" | "success" | "warning" | "danger" | "outline"> = {
  PENDING: "warning",
  PROCESSING: "default",
  SHIPPED: "success",
  DELIVERED: "success",
  CANCELLED: "danger",
};

const statusSteps = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];

export default function TrackOrderPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const id = orderId.trim();
    if (!id) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
      if (!res.ok) {
        if (res.status === 404) setError(t("track.not_found"));
        else setError(`${t("general.error")} ${res.status}`);
        setOrder(null);
      } else {
        const data = await res.json();
        setOrder(data);
      }
    } catch {
      setError(t("general.error"));
      setOrder(null);
    }
    setLoading(false);
  }

  const currentStatusIndex = order ? statusSteps.indexOf(order.status) : -1;
  const isCancelled = order?.status === "CANCELLED";

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="text-center space-y-2">
        <Package className="h-10 w-10 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">{t("track.title")}</h1>
        <p className="text-muted-foreground">{t("track.subtitle")}</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 max-w-md mx-auto">
        <input
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder={t("track.order_id")}
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
        />
        <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {loading ? t("general.loading") : <><Search className="h-4 w-4 inline me-1" />{t("track.search")}</>}
        </button>
      </form>

      {searched && !loading && (
        <>
          {error && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>{error}</p>
              </CardContent>
            </Card>
          )}

          {order && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("track.id_label")}</p>
                      <p className="font-mono text-sm">{order.id}</p>
                    </div>
                    <Badge variant={statusColor[order.status]} className="text-sm px-3 py-1">
                      {t(`track.status_${order.status}`)}
                    </Badge>
                  </div>

                  {!isCancelled && (
                    <div className="flex items-center gap-0">
                      {statusSteps.map((step, i) => {
                        const stepStatus = i < currentStatusIndex ? "completed" : i === currentStatusIndex ? "current" : "upcoming";
                        return (
                          <div key={step} className="flex-1 flex items-center">
                            <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold shrink-0 ${stepStatus === "completed" ? "bg-primary text-primary-foreground" : stepStatus === "current" ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"}`}>
                              {stepStatus === "completed" ? "✓" : i + 1}
                            </div>
                            <div className={`h-0.5 flex-1 mx-1 ${i < statusSteps.length - 1 ? (i < currentStatusIndex ? "bg-primary" : "bg-muted") : ""}`} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {statusSteps.map((step) => (
                      <span key={step} className="text-center flex-1">{t(`track.status_${step}`)}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-sm">{t("track.customer")}</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>{order.customerName}</p>
                    <p className="text-muted-foreground">{order.customerEmail}</p>
                    <p className="text-muted-foreground">{order.customerPhone}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">{t("track.shipping_address")}</CardTitle></CardHeader>
                  <CardContent className="text-sm text-muted-foreground flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{order.shippingAddress || "—"}</span>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-sm">{t("track.items")} ({order.items.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                        {item.product.images?.[0] && (
                          <img src={item.product.images[0]} alt="" className="h-14 w-14 rounded-lg object-cover bg-muted shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{localizedName(item.product, locale)}</p>
                          <p className="text-xs text-muted-foreground">{t("track.quantity")}: {item.quantity} × {Number(item.price).toFixed(2)}</p>
                        </div>
                        <p className="text-sm font-semibold shrink-0">{(Number(item.price) * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDate(order.createdAt)}
                </div>
                <div className="text-lg font-bold">
                  {t("track.total")}: {Number(order.total).toFixed(2)} {t("merchant.currency")}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

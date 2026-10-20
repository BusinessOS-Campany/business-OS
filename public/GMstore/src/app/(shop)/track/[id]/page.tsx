"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Package, MapPin, Calendar, Check, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/lib/i18n/provider";
import { localizedName } from "@/lib/i18n/localized";

const statusColor: Record<string, "default" | "success" | "warning" | "danger" | "outline"> = {
  PENDING: "warning", PROCESSING: "default", SHIPPED: "success", DELIVERED: "success", CANCELLED: "danger",
};

const statusSteps = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];

export default function TrackOrderByIdPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;
    let cancelled = false;
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(res.status === 404 ? t("track.not_found") : `${t("general.error")} ${res.status}`);
        const data = await res.json();
        if (!cancelled) setOrder(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [params.id]);

  const isCancelled = order?.status === "CANCELLED";

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`, { method: "POST" });
      if (res.ok) {
        setShowConfirm(false);
        setTimeout(() => router.refresh(), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "فشل الإلغاء");
      }
    } catch {
      alert("فشل الإلغاء");
    } finally {
      setCancelling(false);
    }
  }

  const canCancel = order && (order.status === "PENDING" || order.status === "PROCESSING");

  let address: Record<string, string> = {};
  try { address = order?.shippingAddress ? JSON.parse(order.shippingAddress) : {}; } catch { address = { address: order?.shippingAddress || "" }; }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <div className="text-center space-y-2 animate-pulse">
          <div className="h-10 w-10 bg-muted rounded-full mx-auto" />
          <div className="h-6 w-48 bg-muted rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="text-center space-y-2">
        <Package className="h-10 w-10 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">{t("track.title")}</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">{t("track.id_label")}</p>
                <p className="font-mono text-sm">{order.id.slice(0, 8)}...</p>
              </div>
            </div>

            <div className="divide-y divide-border">
              {order.items.filter((item: any) => item.status !== "CANCELLED").map((item: any, idx: number) => {
                const currentStatusIndex = statusSteps.indexOf(item.status);
                return (
                  <div key={item.id} className={`${idx > 0 ? "pt-4" : ""} ${idx < order.items.length - 1 ? "pb-4" : ""}`}>
                    <div className="flex items-center gap-4 mb-3">
                      {item.product.images?.[0] && (
                        <div className="relative shrink-0">
                          <img src={item.product.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover bg-muted" />
                          {item.color && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-background" style={{ backgroundColor: item.color }} />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{localizedName(item.product, locale)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("track.quantity")}: {item.quantity} &times; {Number(item.price).toFixed(2)}
                          {item.color && <> &middot; {item.color}</>}
                        </p>
                      </div>
                      <Badge variant={statusColor[item.status]} className="text-xs shrink-0">
                        {t(`track.status_${item.status}`)}
                      </Badge>
                    </div>

                    {!isCancelled && item.status !== "CANCELLED" && (
                      <>
                        <div className="flex items-center gap-0 mb-1">
                          {statusSteps.map((step, i) => {
                            const stepStatus = i < currentStatusIndex ? "completed" : i === currentStatusIndex ? "current" : "upcoming";
                            return (
                              <div key={step} className="flex-1 flex items-center">
                                <div className={`flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold shrink-0 ${stepStatus === "completed" ? "bg-primary text-primary-foreground" : stepStatus === "current" ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"}`}>
                                  {stepStatus === "completed" ? <Check className="h-3 w-3" /> : i + 1}
                                </div>
                                <div className={`h-0.5 flex-1 mx-[2px] ${i < statusSteps.length - 1 ? (i < currentStatusIndex ? "bg-primary" : "bg-muted") : ""}`} />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          {statusSteps.map((step) => (
                            <span key={step} className="text-center flex-1">{t(`track.status_${step}`)}</span>
                          ))}
                        </div>
                      </>
                    )}
                    {item.status === "CANCELLED" && (
                      <p className="text-xs text-red-500 font-medium mt-1">{t("track.status_CANCELLED")}</p>
                    )}
                  </div>
                );
              })}
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
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{address.city || ""}{address.city && address.street ? "، " : ""}{address.street || ""}</span>
              </div>
              {address.notes && <p className="text-xs">{address.notes}</p>}
            </CardContent>
          </Card>
        </div>

        {address.lat && address.lng ? (
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg h-64">
              <iframe
                src={`https://www.google.com/maps?q=${address.lat},${address.lng}&z=15&output=embed`}
                width="100%"
                height="256"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="موقع الطلب"
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-xs text-muted-foreground">
              لم يتم تحديد موقع على الخريطة
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("checkout.subtotal") || "المجموع الفرعي"}</span>
              <span>{Number(order.subtotal || order.total).toFixed(2)} {t("merchant.currency")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("cart.shipping") || "التوصيل"}</span>
              <span className={Number(order.shippingCost) === 0 ? "text-green-600 font-semibold" : ""}>
                {Number(order.shippingCost) === 0 ? (t("cart.free_shipping") || "مجاني") : `${Number(order.shippingCost).toFixed(2)} ${t("merchant.currency")}`}
              </span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("cart.coupon_discount") || "الخصم"}</span>
                <span className="text-green-600">-{Number(order.discount).toFixed(2)} {t("merchant.currency")}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(order.createdAt)}
              </div>
              <div className="text-lg font-bold">
                {t("track.total")}: {Number(order.total).toFixed(2)} {t("merchant.currency")}
              </div>
            </div>
          </CardContent>
        </Card>

        {canCancel && (
          <div className="text-center">
            <Button variant="danger" onClick={() => setShowConfirm(true)}>
              <XCircle className="h-4 w-4 ml-2" />إلغاء الطلب
            </Button>
          </div>
        )}
      </div>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="تأكيد إلغاء الطلب">
        <p className="mb-4 text-sm text-muted-foreground">هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowConfirm(false)}>إلغاء</Button>
          <Button variant="danger" loading={cancelling} onClick={handleCancel}>تأكيد الإلغاء</Button>
        </div>
      </Modal>
    </div>
  );
}

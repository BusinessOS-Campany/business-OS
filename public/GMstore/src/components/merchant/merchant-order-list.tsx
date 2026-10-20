"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/provider";
import { T } from "@/components/translate";
import { Package, ShoppingBag, Calendar, ChevronDown, ChevronUp, Check, XCircle, Truck, Clock } from "lucide-react";

interface OrderItem {
  id: string;
  productId: string;
  product: {
    name: string;
    nameEn: string | null;
    images: string[];
    price?: number;
    specs?: Record<string, string> | null;
    colors?: string[];
    sizes?: string[];
    discount?: number;
    brand?: string | null;
    colorImages?: Record<string, string> | null;
    colorStock?: Record<string, number> | null;
  };
  quantity: number;
  price: number;
  color: string | null;
  size: string | null;
  status: string;
}

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  status: string;
  shippingAddress: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_FLOW = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];

const stepIcons: Record<string, typeof Package> = {
  PENDING: Clock,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: Check,
  CANCELLED: XCircle,
};

function getNextStatus(current: string): string | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "PENDING": return "warning";
    case "PROCESSING": return "default";
    case "SHIPPED": return "outline";
    case "DELIVERED": return "success";
    case "CANCELLED": return "danger";
    default: return "outline";
  }
}

function getStatusBadgeClass(status: string) {
  if (status !== "SHIPPED") return undefined;
  return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
}

export function MerchantOrderList({ cancelled = false }: { cancelled?: boolean }) {
  const { t, locale, direction } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const [take] = useState(10);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const fetchOrders = async (newSkip: number, append: boolean) => {
    try {
      const res = await fetch(`/api/merchant/orders?skip=${newSkip}&take=${take}${cancelled ? "&cancelled=true" : ""}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      const fetched: Order[] = data.orders || [];
      setOrders((prev) => (append ? [...prev, ...fetched] : fetched));
      setTotal(data.total ?? 0);
      setSkip(newSkip + fetched.length);
    } catch {
      setError(t("general.error"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchOrders(0, false);
  }, [cancelled]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchOrders(skip, true);
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleUpdateStatus = async (orderId: string, itemId: string, status: string) => {
    setUpdatingItems((prev) => new Set(prev).add(itemId));
    try {
      const res = await fetch(`/api/merchant/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, items: order.items.map((item) => (item.id === itemId ? { ...item, status } : item)) }
            : order
        )
      );
    } catch {
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const truncateId = (id: string) => (id.length > 8 ? id.slice(0, 8) + "\u2026" : id);

  if (loading) {
    return (
      <div dir={direction} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><div className="h-24 bg-muted rounded animate-pulse" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div dir={direction} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <XCircle className="mx-auto h-12 w-12 mb-4 text-red-500" />
            <p className="text-lg">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              <T k="merchant.retry" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div dir={direction} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {cancelled ? <T k="merchant.cancelled_orders" /> : <T k="admin.orders" />}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <ShoppingBag className="inline h-4 w-4 ms-1" />
            {t("merchant.orders_count")}
            <span className="font-medium ms-1">{total}</span>
          </p>
        </div>
        <Link href={cancelled ? "/merchant/orders" : "/merchant/orders/cancelled"}>
          <Button variant="outline" size="sm">
            {cancelled ? <T k="admin.orders" /> : <T k="merchant.cancelled_orders" />}
          </Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <ShoppingBag className="mx-auto h-12 w-12 mb-4 opacity-40" />
            <p>{cancelled ? t("merchant.no_cancelled") : t("merchant.no_orders")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              return (
                <Card key={order.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            #{truncateId(order.id)}
                          </span>
                          <Badge variant={getStatusBadgeVariant(order.status)} className={getStatusBadgeClass(order.status)}>
                            <T k={`track.status_${order.status}`} />
                          </Badge>
                        </div>
                        <h3 className="font-semibold mt-1 truncate">{order.customerName}</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <p className="text-lg font-bold">
                          {Number(order.total).toFixed(0)} <T k="merchant.currency" />
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isExpanded ? t("merchant.hide_items") : t("merchant.show_items")}
                      <span className="text-muted-foreground">({order.items.length})</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 divide-y divide-border">
                        {order.items.map((item) => {
                          const displayStatus = order.status === "CANCELLED" ? "CANCELLED" : item.status;
                          const nextStatus = getNextStatus(displayStatus);
                          const isUpdating = updatingItems.has(item.id);
                          const StatusIcon = stepIcons[displayStatus] || Package;
                          return (
                            <div key={item.id} className="flex items-start gap-3 pt-3 first:pt-0">
                              <div className="h-14 w-14 rounded-lg border border-border bg-muted overflow-hidden flex-shrink-0 relative">
                                {item.product.images?.[0] ? (
                                  <img src={item.product.images[0]} alt={item.product.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Package className="h-5 w-5 m-auto text-muted-foreground/40" />
                                )}
                                {item.color && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background" style={{ backgroundColor: item.color }} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.product.name}</p>
                                {item.product.brand && <p className="text-[10px] text-muted-foreground mt-0.5">{t("merchant.brand_label")}: {item.product.brand}</p>}
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                                  <span className="font-medium">{item.quantity} × {Number(item.price).toFixed(0)}</span>
                                  {item.color && <><span className="w-1 h-1 rounded-full bg-muted-foreground/30" /><span>{t("merchant.color_label")}: {item.color}</span></>}
                                  {item.size && <><span className="w-1 h-1 rounded-full bg-muted-foreground/30" /><span>{t("merchant.size_label")}: {item.size}</span></>}
                                </div>
                                {item.product.specs && Object.keys(item.product.specs).length > 0 && (
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                                    {Object.entries(item.product.specs).map(([k, v]) => (
                                      <span key={k}>{k}: <b>{String(v)}</b></span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant={getStatusBadgeVariant(displayStatus)} className={getStatusBadgeClass(displayStatus)}>
                                  <StatusIcon className="h-3 w-3 me-1" />
                                  <T k={`track.status_${displayStatus}`} />
                                </Badge>
                                {nextStatus && displayStatus !== "CANCELLED" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    loading={isUpdating}
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateStatus(order.id, item.id, nextStatus)}
                                    className="text-xs whitespace-nowrap"
                                  >
                                    <T k={`track.status_${nextStatus}`} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {skip < total && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleLoadMore} loading={loadingMore} disabled={loadingMore}>
                {t("merchant.load_more")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

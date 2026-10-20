"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ShoppingBag, Ticket, Truck, Package, ChevronUp, Check, Search, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { useCurrency, USD_TO_YER, USD_TO_SAR, type Currency } from "@/lib/currency/context";
import { getCart, removeFromCart, updateQuantity, cartSubtotal, getShippingCost } from "@/lib/cart/store";
import type { CartItem } from "@/types";

const statusSteps = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { currency } = useCurrency();
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [orderExpanded, setOrderExpanded] = useState(false);
  const [showTrackSearch, setShowTrackSearch] = useState(false);
  const [trackOrderId, setTrackOrderId] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  useEffect(() => {
    if (!open) return;
    setItems(getCart());
    setCouponCode("");
    setDiscount(0);
    setCouponMsg("");
    setOrderExpanded(false);
    setShowTrackSearch(false);
    setTrackOrderId("");
    setTrackedOrder(null);
    setTrackError("");
    let cancelled = false;
    async function loadLastOrder() {
      const orderId = localStorage.getItem("lastOrderId");
      if (!orderId) { if (!cancelled) setLastOrder(null); return; }
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (!res.ok) throw new Error();
        const order = await res.json();
        if (!cancelled) {
          if (order?.items?.every((i: any) => i.status === "DELIVERED" || i.status === "CANCELLED") || order?.status === "CANCELLED") {
            localStorage.removeItem("lastOrderId");
            if (!cancelled) setLastOrder(null);
          } else {
            if (!cancelled) setLastOrder(order);
          }
        }
      } catch {
        if (!cancelled) { try { const raw = localStorage.getItem("lastOrder"); setLastOrder(raw ? JSON.parse(raw) : null); } catch { setLastOrder(null); } }
      }
    }
    loadLastOrder();
    const interval = setInterval(loadLastOrder, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [open]);

  useEffect(() => {
    const handler = () => { if (open) setItems(getCart()); };
    window.addEventListener("cartUpdated", handler);
    return () => window.removeEventListener("cartUpdated", handler);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    async function handler() {
      if (!open) return;
      const orderId = localStorage.getItem("lastOrderId");
      if (!orderId) { if (!cancelled) setLastOrder(null); return; }
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (!res.ok) throw new Error();
        const order = await res.json();
        if (!cancelled) {
          if (order?.items?.every((i: any) => i.status === "DELIVERED" || i.status === "CANCELLED") || order?.status === "CANCELLED") {
            localStorage.removeItem("lastOrderId");
            if (!cancelled) setLastOrder(null);
          } else {
            if (!cancelled) setLastOrder(order);
          }
        }
      } catch { if (!cancelled) setLastOrder(null); }
    }
    window.addEventListener("orderPlaced", handler);
    return () => { cancelled = true; window.removeEventListener("orderPlaced", handler); };
  }, [open]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = getShippingCost();

  function formatPrice(priceYer: number) {
    if (currency === "usd") return (priceYer / USD_TO_YER).toFixed(2);
    if (currency === "sar") return (priceYer / USD_TO_YER * USD_TO_SAR).toFixed(2);
    return priceYer.toFixed(2);
  }
  const label = currency === "usd" ? "$" : currency === "sar" ? "رس" : "ريال";

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code) return;
    try {
      const res = await fetch(`/api/coupons/validate/${encodeURIComponent(code)}?subtotal=${subtotal}`);
      const data = await res.json();
      if (data.valid) {
        setDiscount(Math.round(subtotal * data.discount / 100));
        setCouponMsg(t("cart.coupon_applied"));
        localStorage.setItem("appliedCoupon", code);
      } else {
        setDiscount(0);
        setCouponMsg(data.error || t("cart.coupon_invalid"));
        localStorage.removeItem("appliedCoupon");
      }
    } catch {
      setDiscount(0);
      setCouponMsg(t("cart.coupon_error"));
    }
  }

  async function handleTrackOrder(e: React.FormEvent) {
    e.preventDefault();
    const id = trackOrderId.trim();
    if (!id) return;
    setTrackLoading(true);
    setTrackError("");
    setTrackedOrder(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
      if (!res.ok) {
        setTrackError(res.status === 404 ? t("track.not_found") : `${t("general.error")} ${res.status}`);
      } else {
        const data = await res.json();
        setTrackedOrder(data);
        setShowTrackSearch(false);
      }
    } catch {
      setTrackError(t("general.error"));
    }
    setTrackLoading(false);
  }

  const order = lastOrder?.id ? lastOrder : null;
  const orderStatusIndex = order ? statusSteps.indexOf(order.status) : -1;
  const orderCancelled = order?.status === "CANCELLED";

  const track = trackedOrder;
  const trackStatusIndex = track ? statusSteps.indexOf(track.status) : -1;
  const trackCancelled = track?.status === "CANCELLED";

  function renderTracking({ o, isCancelled, statusIndex }: { o: any; isCancelled: boolean; statusIndex: number }) {
    return (
      <>
        <div className={`rounded-lg p-3 text-center ${isCancelled ? "bg-red-50 dark:bg-red-950" : "bg-green-50 dark:bg-green-950"}`}>
          <Package className="h-8 w-8 mx-auto mb-1 text-primary" />
          <p className="text-sm font-bold">{t("track.title")}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5 select-all">{o.id}</p>
          <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
            isCancelled ? "bg-red-200 text-red-700" :
            o.status === "DELIVERED" ? "bg-green-200 text-green-700" :
            o.status === "SHIPPED" ? "bg-blue-200 text-blue-700" :
            "bg-yellow-200 text-yellow-700"
          }`}>
            {t(`track.status_${o.status}`)}
          </span>
        </div>

        {!isCancelled && (
          <div className="px-2 py-3">
            <div className="flex items-center gap-0 mb-1">
              {statusSteps.map((step, i) => {
                const stepStatus = i < statusIndex ? "completed" : i === statusIndex ? "current" : "upcoming";
                return (
                  <div key={step} className="flex-1 flex items-center">
                    <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0 ${
                      stepStatus === "completed" ? "bg-primary text-primary-foreground" :
                      stepStatus === "current" ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {stepStatus === "completed" ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <div className={`h-0.5 flex-1 mx-[2px] ${i < statusSteps.length - 1 ? (i < statusIndex ? "bg-primary" : "bg-muted") : ""}`} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              {statusSteps.map((step) => (
                <span key={step} className="text-center flex-1">{t(`track.status_${step}`)}</span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">{t("track.items")} ({(o.items?.filter((i: any) => i.status !== "CANCELLED" && i.status !== "DELIVERED")?.length || 0)})</p>
          {(o.items?.filter((i: any) => i.status !== "CANCELLED" && i.status !== "DELIVERED") || []).map((item: any) => (
            <div key={item.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
              {item.product?.images?.[0] && (
                <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-muted relative">
                  <Image src={item.product.images[0]} alt="" fill className="object-cover" sizes="56px" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-semibold truncate">{item.product?.name || item.product?.nameEn || ""}</p>
                <p className="text-xs text-muted-foreground">{t("track.quantity")}: {item.quantity} × {Number(item.price).toFixed(2)}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {statusSteps.map((s) => (
                    <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded ${
                      statusSteps.indexOf(s) < statusSteps.indexOf(item.status) ? "bg-primary/20 text-primary" :
                      s === item.status ? "bg-primary text-primary-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {t(`track.status_${s}`)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-muted-foreground">{t("track.total")}</span>
          <span className="text-lg font-bold text-primary">{Number(o.total).toFixed(2)} {t("merchant.currency")}</span>
        </div>
      </>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 end-0 z-50 w-full max-w-md bg-background border-s border-border shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                {t("cart.drawer_title")}
                {items.length > 0 && <span className="text-sm text-muted-foreground">({items.length})</span>}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowTrackSearch(!showTrackSearch); setTrackError(""); setTrackedOrder(null); }} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted" title={t("cart.track_order")}>
                  <Search className="h-4 w-4" />
                </button>
                <button onClick={onClose} className="p-1 hover:text-primary transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Track order search bar */}
            {showTrackSearch && (
              <form onSubmit={handleTrackOrder} className="px-4 py-3 border-b border-border">
                <div className="flex gap-2">
                  <input type="text" value={trackOrderId} onChange={(e) => setTrackOrderId(e.target.value)} placeholder={t("track.order_id")} className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary bg-background" />
                  <button type="submit" disabled={trackLoading} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                    {trackLoading ? "..." : t("track.search")}
                  </button>
                </div>
                {trackError && <p className="text-xs text-red-500 mt-1">{trackError}</p>}
                {trackedOrder && (
                  <button type="button" onClick={() => { setShowTrackSearch(true); setTrackedOrder(null); setTrackOrderId(""); setTrackError(""); }} className="text-xs text-primary hover:underline mt-1">
                    {t("cart.track_another")}
                  </button>
                )}
              </form>
            )}

            {/* Flat shipping fee notice */}
            {!trackedOrder && (
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" />
                  <span>الشحن: {formatPrice(shippingCost)} {label} لجميع الطلبات</span>
                </div>
              </div>
            )}

            {/* Last order tracking (collapsible, above cart items) */}
            {order && !trackedOrder && (
              <div className="border-b border-border">
                <button
                  onClick={() => setOrderExpanded(!orderExpanded)}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    {t("cart.track_title")}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${orderExpanded ? "rotate-180" : ""}`} />
                </button>
                {orderExpanded && (
                  <div className="px-4 pb-3 space-y-3">
                    {renderTracking({ o: order, isCancelled: orderCancelled, statusIndex: orderStatusIndex })}
                    <button onClick={() => setOrderExpanded(false)} className="block w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors">
                      {t("cart.new_order")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Items / Tracked order body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {trackedOrder ? (
                <>
                  {renderTracking({ o: trackedOrder, isCancelled: trackCancelled, statusIndex: trackStatusIndex })}
                  <button type="button" onClick={() => { setShowTrackSearch(true); setTrackedOrder(null); setTrackOrderId(""); setTrackError(""); }} className="text-xs text-primary hover:underline">
                    {t("cart.track_another")}
                  </button>
                </>
              ) : items.length === 0 && !order ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{t("cart.empty_drawer")}</p>
                  <button onClick={onClose} className="text-sm text-primary hover:underline">{t("cart.continue_shopping")}</button>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={`${item.productId}-${item.color || ""}-${item.size || ""}-${idx}`} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-muted relative">
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <Link href={`/products/${item.productId}`} className="text-sm font-semibold line-clamp-2 hover:text-primary" onClick={onClose}>
                        {item.name}
                      </Link>
                      {item.color && <span className="text-xs text-muted-foreground">{item.color}</span>}
                      {item.size && <span className="text-xs text-muted-foreground mr-1">{item.size}</span>}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-0.5 border border-border rounded-lg">
                          <button onClick={() => updateQuantity(item.productId, item.color, -1)} className="p-1 hover:text-primary transition-colors">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-semibold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, item.color, 1)} className="p-1 hover:text-primary transition-colors">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary">{formatPrice(item.price)} {label}</span>
                          <button onClick={() => { removeFromCart(item.productId, item.color); setItems(getCart()); }} className="p-1 text-muted-foreground hover:text-red-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Coupon + Footer (only if cart has items and no trackedOrder) */}
            {!trackedOrder && items.length > 0 && (
              <>
                <div className="px-4 py-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder={t("cart.coupon_placeholder")}
                      className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary bg-background"
                    />
                    <button onClick={applyCoupon} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                      {t("cart.coupon_apply")}
                    </button>
                  </div>
                  {couponMsg && <p className={`text-xs mt-1 ${discount > 0 ? "text-green-600" : "text-red-500"}`}>{couponMsg}</p>}
                </div>
                <div className="border-t border-border p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                    <span className="font-semibold">{formatPrice(subtotal)} {label}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("cart.coupon_discount")} ({couponCode})</span>
                      <span className="font-semibold text-green-600">-{formatPrice(discount)} {label}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("cart.shipping")}</span>
                    <span>{formatPrice(shippingCost)} {label}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                    <span>{t("cart.total")}</span>
                    <span className="text-primary">{formatPrice(subtotal - discount)} {label}</span>
                  </div>
                  <Link
                    href="/checkout"
                    onClick={onClose}
                    className="block w-full text-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity mt-2"
                  >
                    {t("cart.checkout")}
                  </Link>
                  <button onClick={onClose} className="block w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors">
                    {t("cart.continue_shopping")}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

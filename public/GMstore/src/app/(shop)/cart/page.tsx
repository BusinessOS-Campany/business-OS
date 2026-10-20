"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, ShoppingBag } from "lucide-react";
import type { CartItem } from "@/types";
import { FadeIn } from "@/components/motion-wrappers";
import { useI18n } from "@/lib/i18n/provider";

export default function CartPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    setItems(cart);
    setMounted(true);

    let cancelled = false;
    async function checkLastOrder() {
      const orderId = localStorage.getItem("lastOrderId");
      if (!orderId) return;
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (!res.ok) throw new Error();
        const order = await res.json();
        if (!cancelled && order?.items) {
          if (order.items.every((i: any) => i.status === "DELIVERED") || order.status === "CANCELLED") {
            localStorage.removeItem("lastOrderId");
            setLastOrder(null);
          } else {
            setLastOrder(order);
          }
        }
      } catch {}
    }
    checkLastOrder();
    const interval = setInterval(checkLastOrder, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  function updateCart(newItems: CartItem[]) {
    setItems(newItems);
    localStorage.setItem("cart", JSON.stringify(newItems));
  }

  function removeItem(productId: string, color?: string) {
    updateCart(items.filter((i) => !(i.productId === productId && i.color === color)));
  }

  function updateQuantity(productId: string, color: string | undefined, delta: number) {
    updateCart(
      items.map((i) =>
        i.productId === productId && i.color === color ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );
  }

  function changeColor(productId: string, oldColor: string | undefined, newColor: string) {
    const target = items.find((i) => i.productId === productId && i.color === oldColor);
    if (!target) return;
    const existing = items.find((i) => i.productId === productId && i.color === newColor && i.color !== oldColor);
    let next: CartItem[];
    if (existing) {
      existing.quantity += target.quantity;
      next = items.filter((i) => !(i.productId === productId && i.color === oldColor));
    } else {
      next = items.map((i) =>
        i.productId === productId && i.color === oldColor ? { ...i, color: newColor } : i
      );
    }
    updateCart(next);
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (!mounted) return null;

  return (
    <FadeIn>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <h1 className="text-2xl font-bold">{t("cart.title")}</h1>
        {lastOrder && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 text-sm text-green-800 dark:text-green-200 flex items-center justify-between">
            <span>{t("cart.pending_order") || "لديك طلب قيد التوصيل"}</span>
            <Link href={`/track/${lastOrder.id}`}><Button size="sm" variant="outline">{t("cart.track") || "تتبع"}</Button></Link>
          </motion.div>
        )}
        {items.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-4">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t("cart.empty")}</p>
            <Link href="/products"><Button>{t("cart.shop_now")}</Button></Link>
          </motion.div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={`${item.productId}-${item.color || ""}`}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardContent className="flex gap-4 p-4">
                        <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-muted overflow-hidden relative">
                          {item.image ? (
                            <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">{t("product.no_image")}</div>
                          )}
                        </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">{item.price.toFixed(2)} {t("merchant.currency")}</p>
                            {item.color || item.colors?.length ? (
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {item.colors?.length ? (
                                  <>
                                    <span className="text-xs text-muted-foreground">اللون:</span>
                                    {item.colors.map((c) => (
                                      <button
                                        key={c}
                                        type="button"
                                        onClick={() => changeColor(item.productId, item.color, c)}
                                        className={`h-5 w-5 rounded-full border-2 transition-all ${item.color === c ? "border-foreground scale-110" : "border-border hover:scale-105"}`}
                                        style={{ backgroundColor: c }}
                                        title={c}
                                      />
                                    ))}
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    اللون: <span className="h-3.5 w-3.5 rounded-full border border-border inline-block" style={{ backgroundColor: item.color }} />
                                  </span>
                                )}
                              </div>
                            ) : null}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, item.color, -1)}>-</Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, item.color, 1)}>+</Button>
                            </div>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button size="sm" variant="danger" onClick={() => removeItem(item.productId, item.color)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold">{t("cart.summary")}</h2>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("cart.total")}</span>
                    <span className="font-bold text-lg">{total.toFixed(2)} {t("merchant.currency")}</span>
                  </div>
                  <Link href="/checkout">
                    <Button className="w-full">{t("cart.checkout")}</Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}

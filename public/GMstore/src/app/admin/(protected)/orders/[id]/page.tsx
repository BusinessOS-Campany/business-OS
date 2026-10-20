"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, MapPin, Package } from "lucide-react";
import { T } from "@/components/translate";
import { OrderMap } from "@/components/admin/order-map";
import { useI18n } from "@/lib/i18n/provider";

const itemStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

const statusVariant: Record<string, "warning" | "success" | "danger" | "default"> = {
  PENDING: "warning",
  PROCESSING: "warning",
  SHIPPED: "warning",
  DELIVERED: "success",
  CANCELLED: "danger",
};

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  return <Badge variant={statusVariant[status] || "default"}>{t(`orders.status_${status}`)}</Badge>;
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const { t } = useI18n();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [itemUpdating, setItemUpdating] = useState<string | null>(null);

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Order data items:", data.items?.length, data.items);
        setOrder(data);
      }
    } catch (err) {
      console.error("Failed to fetch order", err);
    }
    setLoading(false);
  }

  useEffect(() => { fetchOrder(); }, []);

  async function updateItemStatus(itemId: string, status: string) {
    setItemUpdating(itemId);
    await fetch(`/api/orders/${params.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchOrder();
    setItemUpdating(null);
  }

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded" />;
  if (!order) return <p className="text-destructive">{t("admin.order_not_found")}</p>;
  console.log("items count:", order.items?.length, "items:", order.items?.map((i: any) => ({ id: i.id?.slice(0,8), status: i.status, price: typeof i.price, qty: i.quantity })));

  let address: Record<string, string> = {};
  try { address = JSON.parse(order.shippingAddress || "{}"); } catch { address = { address: order.shippingAddress || "" }; }

  const lat = address.lat ? Number(address.lat) : null;
  const lng = address.lng ? Number(address.lng) : null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/orders">
          <Button variant="outline" size="sm"><ArrowRight className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl md:text-2xl font-bold">{t("admin.order_detail")}</h1>
        <span className="mr-auto font-mono text-[10px] md:text-xs text-muted-foreground break-all max-w-[120px] md:max-w-none">{order.id}</span>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm md:text-base"><T k="checkout.shipping_details" /></CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs md:text-sm">
            <p><span className="font-medium text-muted-foreground"><T k="checkout.city" />:</span> {address.city || "—"}</p>
            <p><span className="font-medium text-muted-foreground"><T k="checkout.street" />:</span> {address.street || "—"}</p>
            {address.notes && <p><span className="font-medium text-muted-foreground"><T k="checkout.notes" />:</span> {address.notes}</p>}
            {lat && lng && (
              <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary text-xs mt-2">
                <MapPin className="h-3.5 w-3.5" /> {t("admin.view_map")}
              </a>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm md:text-base"><T k="checkout.customer" /></CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs md:text-sm">
            <p><span className="font-medium text-muted-foreground"><T k="checkout.full_name" />:</span> {order.customerName}</p>
            <p><span className="font-medium text-muted-foreground"><T k="checkout.email" />:</span> {order.customerEmail}</p>
            <p><span className="font-medium text-muted-foreground"><T k="checkout.phone_label" />:</span> {order.customerPhone}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm md:text-base">{t("admin.customer_location")}</CardTitle></CardHeader>
        <CardContent>
          {lat && lng ? (
            <OrderMap lat={lat} lng={lng} />
          ) : (
            <p className="text-xs text-muted-foreground">{t("admin.no_map_location")}</p>
          )}
        </CardContent>
      </Card>

      <div className="max-md:hidden">
        <Card>
          <CardHeader><CardTitle className="text-sm md:text-base"><T k="checkout.items" /></CardTitle></CardHeader>
          <CardContent className="p-0 md:p-6">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>{t("admin.product_name")}</TableHead>
                  <TableHead>{t("admin.color_size")}</TableHead>
                  <TableHead><T k="checkout.qty" /></TableHead>
                  <TableHead><T k="admin.price" /></TableHead>
                  <TableHead>{t("admin.total")}</TableHead>
                  <TableHead>{t("admin.specifications")}</TableHead>
                  <TableHead>{t("admin.item_status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {order.items?.length > 0 ? order.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.product?.images?.[0] ? (
                          <div className="relative shrink-0">
                            <img src={item.product.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover bg-muted" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-muted-foreground" /></div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.product?.name || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.color && <div className="h-5 w-5 rounded-full border border-border shrink-0" style={{ backgroundColor: item.color }} title={item.color} />}
                        <span className="text-xs">{[item.color && item.color, item.size && `${t("admin.size_prefix")} ${item.size}`].filter(Boolean).join(" - ")}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="whitespace-nowrap">{Number(item.price).toFixed(2)} {t("admin.currency_rial")}</TableCell>
                    <TableCell className="whitespace-nowrap">{(Number(item.price) * item.quantity).toFixed(2)} {t("admin.currency_rial")}</TableCell>
                    <TableCell>
                      {item.product?.specs ? (
                        <div className="text-[10px] space-y-0.5 max-w-[200px]">
                          {Object.entries(
                            typeof item.product.specs === "object" ? item.product.specs : {}
                          ).map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-2">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-medium">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={itemUpdating === item.id ? t("general.loading") : item.status}
                        onChange={(e) => updateItemStatus(item.id, e.target.value)}
                        options={itemStatuses.map((s) => ({ value: s, label: t(`orders.status_${s}`) }))}
                        className="w-36"
                      />
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">{t("admin.no_items_in_order")}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="md:hidden space-y-3">
        {order.items?.length > 0 ? order.items.map((item: any) => (
          <Card key={item.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-3">
                {item.product?.images?.[0] ? (
                  <div className="relative shrink-0">
                    <img src={item.product.images[0]} alt="" className="h-14 w-14 rounded-lg object-cover bg-muted" />
                    {item.color && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background" style={{ backgroundColor: item.color }} />}
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0"><Package className="h-5 w-5 text-muted-foreground" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.product?.name || "—"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.color && <div className="h-4 w-4 rounded-full border border-border shrink-0" style={{ backgroundColor: item.color }} title={item.color} />}
                    <span className="text-xs text-muted-foreground">{item.color && item.color}{item.color && item.size && " - "}{item.size && `${t("admin.size_prefix")} ${item.size}`}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.quantity} × {Number(item.price).toFixed(2)} {t("admin.currency_rial")}</p>
                  {item.product?.specs && (
                    <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                      {Object.entries(
                        typeof item.product.specs === "object" ? item.product.specs : {}
                      ).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span>{k}:</span>
                          <span className="font-medium">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold">{(Number(item.price) * item.quantity).toFixed(2)} {t("admin.currency_rial")}</p>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <StatusBadge status={item.status} t={t} />
                  <Select
                    value={itemUpdating === item.id ? t("general.loading") : item.status}
                    onChange={(e) => updateItemStatus(item.id, e.target.value)}
                    options={itemStatuses.map((s) => ({ value: s, label: t(`orders.status_${s}`) }))}
                    className="w-28 text-xs"
                  />
              </div>
            </CardContent>
          </Card>
        )        ) : (
          <div className="text-center text-muted-foreground py-8">{t("admin.no_items_in_order")}</div>
        )}
      </div>

      <div className="text-left space-y-1">
        <p className="text-sm text-muted-foreground">{t("admin.subtotal")}: {Number(order.subtotal || order.total).toFixed(2)} {t("admin.currency_rial")}</p>
        <p className="text-sm text-muted-foreground">{t("admin.shipping")}: {Number(order.shippingCost) === 0 ? t("admin.free") : `${Number(order.shippingCost).toFixed(2)} ${t("admin.currency_rial")}`}</p>
        {Number(order.discount) > 0 && <p className="text-sm text-green-600">{t("admin.discount")}: -{Number(order.discount).toFixed(2)} {t("admin.currency_rial")}</p>}
        <p className="text-lg md:text-xl font-bold pt-2 border-t border-border">
          {t("admin.total")}: {Number(order.total).toFixed(2)} {t("admin.currency_rial")}
        </p>
        <p className="text-[11px] md:text-xs text-muted-foreground mt-1">
          {t("admin.order_date")}: {new Date(order.createdAt).toLocaleDateString("ar-SA")}
        </p>
      </div>
    </div>
  );
}

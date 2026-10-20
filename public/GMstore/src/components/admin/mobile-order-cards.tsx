"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SwipeableCard } from "@/components/ui/swipeable-card";
import { OrderLocationLink } from "@/components/admin/order-location-link";
import { useI18n } from "@/lib/i18n/provider";

const statusVariant: Record<string, "warning" | "success" | "danger" | "default"> = {
  PENDING: "warning",
  PROCESSING: "warning",
  SHIPPED: "warning",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export function MobileOrderCards({ orders }: { orders: any[] }) {
  const router = useRouter();
  const { t } = useI18n();

  function statusLabel(s: string) {
    switch (s) {
      case "PENDING": return t("admin.order_status_pending");
      case "PROCESSING": return t("admin.order_status_processing");
      case "SHIPPED": return t("admin.order_status_shipped");
      case "DELIVERED": return t("admin.order_status_delivered");
      case "CANCELLED": return t("admin.order_status_cancelled");
      default: return s;
    }
  }

  if (orders.length === 0) {
    return <div className="text-center text-muted-foreground py-8">{t("admin.no_orders_yet")}</div>;
  }

  return (
    <div className="space-y-3">
      {orders.map((o: any) => {
        const nonDelivered = o.status !== "DELIVERED" && o.status !== "CANCELLED";
        const actions = nonDelivered
          ? [
              ...(o.status !== "SHIPPED" ? [{
                key: "next",
                label: o.status === "PENDING" ? t("admin.process") : t("admin.ship"),
                color: "#eab308",
                onSwipe: async () => {
                  const next = o.status === "PENDING" ? "PROCESSING" : "SHIPPED";
                  await fetch(`/api/orders/${o.id}/status`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: next }),
                  });
                  router.refresh();
                },
              }] : []),
              {
                key: "deliver",
                label: t("admin.deliver"),
                color: "#22c55e",
                onSwipe: async () => {
                  await fetch(`/api/orders/${o.id}/status`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "DELIVERED" }),
                  });
                  router.refresh();
                },
              },
            ]
          : [];

        return (
          <SwipeableCard
            key={o.id}
            onTap={() => router.push(`/admin/orders/${o.id}`)}
            actions={actions}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
                <Badge variant={statusVariant[o.status] || "default"}>{statusLabel(o.status)}</Badge>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {o.items.slice(0, 4).map((item: any) => (
                    <div key={item.id} className="relative h-8 w-8 rounded-full border-2 border-background overflow-hidden" title={`${item.product?.name || ""}${item.color ? ` (${item.color})` : ""}${item.size ? ` [${item.size}]` : ""}`}>
                      {item.product?.images?.[0] ? (
                        <img src={item.product.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                      {item.color && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full border border-background" style={{ backgroundColor: item.color }} />}
                    </div>
                  ))}
                  {o.items.length > 4 && <span className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] text-muted-foreground">+{o.items.length - 4}</span>}
                </div>
                <span className="text-sm font-medium">{o.items.length} {t("admin.items_count")}</span>
              </div>
              <div className="text-sm mb-1"><span className="text-muted-foreground">{t("admin.customer")}: </span>{o.customerName}</div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ar-SA")}</span>
                <div className="flex items-center gap-2">
                  <OrderLocationLink shippingAddress={o.shippingAddress} />
                  <span className="text-sm font-semibold">{Number(o.total).toFixed(2)} {t("admin.rial")}</span>
                </div>
              </div>
            </div>
          </SwipeableCard>
        );
      })}
    </div>
  );
}

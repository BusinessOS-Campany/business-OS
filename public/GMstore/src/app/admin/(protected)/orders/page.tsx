import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Eye, CheckCheck, XCircle } from "lucide-react";
import { MobileOrderCards } from "@/components/admin/mobile-order-cards";
import { OrderLocationLink } from "@/components/admin/order-location-link";
import { T } from "@/components/translate";
import { getServerTranslations } from "@/lib/i18n/server";

const PAGE_SIZE = 20;

function statusLabel(t: (k: string) => string, status: string) {
  return t(`orders.status_${status}`);
}

const statusVariant: Record<string, "warning" | "success" | "danger" | "default"> = {
  PENDING: "warning",
  PROCESSING: "warning",
  SHIPPED: "warning",
  DELIVERED: "success",
  CANCELLED: "danger",
};

function OrderThumbs({ items }: { items: any[] }) {
  return (
    <div className="flex -space-x-2 rtl:space-x-reverse">
      {items.slice(0, 4).map((item: any) => (
        <div key={item.id} className="relative h-8 w-8 rounded-full border-2 border-background overflow-hidden" title={`${item.product?.name || ""}${item.color ? ` (${item.color})` : ""}${item.size ? ` [${item.size}]` : ""}`}>
          {item.product?.images?.[0] ? (
            <img src={item.product.images[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
          {item.color && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full border border-background" style={{ backgroundColor: item.color }} />}
        </div>
      ))}
      {items.length > 4 && <span className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] text-muted-foreground">+{items.length - 4}</span>}
    </div>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const { t } = await getServerTranslations();
  let rawOrders: any[] = [];
  let totalCount = 0;
  try {
    [rawOrders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip,
      }),
      prisma.order.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
    ]);
  } catch { rawOrders = []; totalCount = 0; }
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const orders = rawOrders.map((o) => ({
    ...o,
    subtotal: Number(o.subtotal),
    shippingCost: Number(o.shippingCost),
    discount: Number(o.discount),
    total: Number(o.total),
    items: o.items.map((i: any) => ({ ...i, price: Number(i.price) })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold"><T k="admin.orders" /></h1>
        <div className="mr-auto flex gap-2">
          <Link href="/admin/orders" className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-colors"><T k="admin.current_orders" /></Link>
          <Link href="/admin/orders/delivered" className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-transparent px-3 text-sm font-medium hover:bg-muted transition-colors"><CheckCheck className="h-4 w-4 ml-1" /><T k="admin.orders_completed" /></Link>
          <Link href="/admin/orders/cancelled" className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-transparent px-3 text-sm font-medium hover:bg-muted transition-colors"><XCircle className="h-4 w-4 ml-1" /><T k="admin.cancelled_orders" /></Link>
        </div>
      </div>

      <div className="max-md:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><T k="admin.order_id" /></TableHead>
              <TableHead><T k="admin.customer" /></TableHead>
              <TableHead><T k="admin.products" /></TableHead>
              <TableHead><T k="admin.total" /></TableHead>
              <TableHead><T k="admin.status" /></TableHead>
              <TableHead><T k="admin.date" /></TableHead>
              <TableHead><T k="admin.location" /></TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground"><T k="admin.no_orders" /></TableCell></TableRow>
            )}
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <div className="text-sm">{o.customerName}</div>
                  <div className="text-xs text-muted-foreground">{o.customerEmail}</div>
                </TableCell>
                <TableCell><OrderThumbs items={o.items} /></TableCell>
                <TableCell>{Number(o.total).toFixed(2)} {t("admin.currency_rial")}</TableCell>
                <TableCell><Badge variant={statusVariant[o.status] || "default"}>{statusLabel(t, o.status)}</Badge></TableCell>
                <TableCell>{o.createdAt.toLocaleDateString("ar-SA")}</TableCell>
                <TableCell><OrderLocationLink shippingAddress={o.shippingAddress} /></TableCell>
                <TableCell>
                  <Link href={`/admin/orders/${o.id}`}>
                    <Button variant="outline" size="sm"><Eye className="h-4 w-4" /></Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/admin/orders?page=${page - 1}`}>
              <Button variant="outline" size="sm"><ChevronRight className="h-4 w-4" /></Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/admin/orders?page=${page + 1}`}>
              <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4" /></Button>
            </Link>
          )}
        </div>
      )}

      <div className="md:hidden">
        <MobileOrderCards orders={orders} />
      </div>
    </div>
  );
}

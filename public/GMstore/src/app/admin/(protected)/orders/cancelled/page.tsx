import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, ArrowLeft, XCircle } from "lucide-react";
import { T } from "@/components/translate";
import { getServerTranslations } from "@/lib/i18n/server";

function OrderThumbs({ items }: { items: any[] }) {
  return (
    <div className="flex -space-x-2 rtl:space-x-reverse">
      {items.slice(0, 4).map((item: any) => (
        <div key={item.id} className="relative h-8 w-8 rounded-full border-2 border-background overflow-hidden" title={`${item.product?.name || ""}${item.color ? ` (${item.color})` : ""}`}>
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

export default async function AdminCancelledOrdersPage() {
  const { t } = await getServerTranslations();
  let orders: any[] = [];
  try {
    orders = await prisma.order.findMany({
      where: { status: "CANCELLED" },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch { orders = []; }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold"><T k="admin.cancelled_orders" /></h1>
        <Link href="/admin/orders" className="mr-auto inline-flex h-8 items-center justify-center rounded-lg border border-border bg-transparent px-3 text-sm font-medium hover:bg-muted transition-colors"><T k="admin.current_orders" /></Link>
      </div>

      <div className="max-md:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><T k="admin.order_id" /></TableHead>
              <TableHead><T k="admin.customer" /></TableHead>
              <TableHead><T k="admin.products" /></TableHead>
              <TableHead><T k="admin.total" /></TableHead>
              <TableHead><T k="admin.cancelled_date" /></TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <div className="text-sm">{o.customerName}</div>
                  <div className="text-xs text-muted-foreground">{o.customerEmail}</div>
                </TableCell>
                <TableCell><OrderThumbs items={o.items} /></TableCell>
                <TableCell className="text-red-600">{Number(o.total).toFixed(2)} {t("admin.currency_rial")}</TableCell>
                <TableCell>{o.createdAt.toLocaleDateString("ar-SA")}</TableCell>
                <TableCell>
                  <Link href={`/admin/orders/${o.id}`}>
                    <Button variant="outline" size="sm"><Eye className="h-4 w-4" /></Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  <T k="admin.no_cancelled_orders" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {orders.length === 0 && (
          <div className="text-center text-muted-foreground py-8"><T k="admin.no_cancelled_orders" /></div>
        )}
        {orders.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="block rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
              <Badge variant="danger"><XCircle className="h-3 w-3 ml-1" />{t("orders.status_CANCELLED")}</Badge>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <OrderThumbs items={o.items} />
              <span className="text-sm font-medium">{o.items.length} {t("admin.products")}</span>
            </div>
            <div className="text-sm mb-1">
              <span className="text-muted-foreground">{t("admin.customer")}: </span>{o.customerName}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{o.createdAt.toLocaleDateString("ar-SA")}</span>
              <span className="text-sm font-semibold text-red-600">{Number(o.total).toFixed(2)} {t("admin.currency_rial")}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

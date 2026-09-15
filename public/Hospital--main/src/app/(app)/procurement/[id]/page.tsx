import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ShoppingCart, Truck, Phone } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getPurchaseOrderById } from "@/lib/services/pharmacy";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PoStatusActions } from "@/features/pharmacy/po-status-actions";

export const metadata = { title: "Purchase Order" };

const STATUS_KEY: Record<string, string> = {
  DRAFT: "statusDraft",
  SUBMITTED: "statusSubmitted",
  APPROVED: "statusApproved",
  PARTIALLY_RECEIVED: "statusPartiallyReceived",
  RECEIVED: "statusReceived",
  CANCELLED: "statusCancelled",
};

const STATUS_COLOR: Record<string, "secondary" | "info" | "warning" | "success" | "destructive"> = {
  DRAFT: "secondary",
  SUBMITTED: "info",
  APPROVED: "warning",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "destructive",
};

export default async function PoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("procurement");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>(
      (o, k) => (o as Record<string, unknown>)?.[k],
      messages
    );
    return typeof value === "string" ? value : key;
  };

  const po = await getPurchaseOrderById(id);
  if (!po) notFound();

  const nameOf = (a: string, b: string) => (locale === "ar" ? a : b);
  const fmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-YE" : "en-US");

  const breadcrumbs: Crumb[] = [
    { label: t("pharmacy.title"), href: "/pharmacy" },
    { label: t("pharmacy.purchaseOrders"), href: "/procurement" },
    { label: po.poNo },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={po.poNo}
        description={formatDateTime(po.orderedAt, locale)}
        icon={<ShoppingCart />}
        breadcrumbs={breadcrumbs}
        actions={<PoStatusActions poId={po.id} status={po.status} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Truck className="size-5" />
                </div>
                <div>
                  <p className="font-semibold">{nameOf(po.supplier.nameAr, po.supplier.nameEn)}</p>
                  <p className="text-xs text-muted-foreground font-mono">{po.supplier.taxNo ?? po.poNo}</p>
                </div>
              </div>
              <Badge variant={STATUS_COLOR[po.status] ?? "secondary"}>
                {t(`pharmacy.${STATUS_KEY[po.status] ?? "statusDraft"}`)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
              {po.supplier.phone ? (
                <span dir="ltr" className="inline-flex items-center gap-1"><Phone className="size-3" /> {po.supplier.phone}</span>
              ) : (
                <span>—</span>
              )}
              <span>
                {t("pharmacy.warehouses")}: {po.warehouse ? nameOf(po.warehouse.nameAr, po.warehouse.nameEn) : "—"}
              </span>
              <span>
                {t("pharmacy.receivedDate")}: {po.receivedAt ? po.receivedAt.toISOString().slice(0, 10) : "—"}
              </span>
              <span>
                {t("pharmacy.expectedDate")}: {po.expectedAt ? po.expectedAt.toISOString().slice(0, 10) : "—"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-3 text-start">{t("pharmacy.itemName")}</th>
                    <th className="py-2 pr-3 text-end">{t("pharmacy.quantity")}</th>
                    <th className="py-2 pr-3 text-end">{t("pharmacy.unitPrice")}</th>
                    <th className="py-2 text-end">{t("pharmacy.total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {po.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-3">
                        {nameOf(item.item.nameAr, item.item.nameEn)}
                        {item.batchNo ? (
                          <p className="text-xs text-muted-foreground font-mono">{item.batchNo}</p>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3 text-end">
                        <span className="tabular-nums">{item.quantity}</span>
                        {item.receivedQty > 0 ? (
                          <span className="ms-1 text-xs text-muted-foreground">({item.receivedQty})</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3 text-end tabular-nums">{fmt(Number(item.unitPrice.toNumber()))}</td>
                      <td className="py-2.5 text-end font-medium tabular-nums">{fmt(Number(item.total.toNumber()))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t text-sm font-semibold">
                  <tr>
                    <td colSpan={3} className="py-2 pr-3 text-end">{t("pharmacy.total")}</td>
                    <td className="py-2 text-end tabular-nums">{fmt(Number(po.total.toNumber()))} YER</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm font-medium">{t("pharmacy.poDetail")}</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("pharmacy.statusDraft")}</dt><dd>—</dd></div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("pharmacy.statusSubmitted")}</dt>
                <dd>{po.orderedAt.toLocaleDateString(locale === "ar" ? "ar-YE" : "en-US")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("pharmacy.items")}</dt>
                <dd className="tabular-nums">{po.items.length}</dd>
              </div>
              {po.note ? (
                <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{po.note}</div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
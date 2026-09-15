import Link from "next/link";
import { cookies } from "next/headers";
import { ShoppingCart, Plus } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getPurchaseOrders } from "@/lib/services/pharmacy";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PoStatusActions } from "@/features/pharmacy/po-status-actions";

export const metadata = { title: "Purchase Orders" };

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

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("procurement");
  const { status } = await searchParams;
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

  const orders = await getPurchaseOrders({ status });
  const patientName = (a: string, b: string) => (locale === "ar" ? a : b);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("pharmacy.purchaseOrders")}
        description={t("procurement.purchaseOrders")}
        icon={<ShoppingCart />}
        actions={
          <Button asChild size="sm">
            <Link href="/procurement/new">
              <Plus className="size-3.5" />
              {t("pharmacy.newPurchaseOrder")}
            </Link>
          </Button>
        }
      />

      {orders.length === 0 ? (
        <Card className="py-10 text-center text-sm text-muted-foreground">{t("procurement.noPOs")}</Card>
      ) : (
        <div className="space-y-3">
          {orders.map((po) => (
            <Card key={po.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/procurement/${po.id}`} className="flex items-center gap-3 hover:underline">
                  <span className="font-mono text-sm font-medium">{po.poNo}</span>
                  <span className="font-medium">
                    {patientName(po.supplier.nameAr, po.supplier.nameEn)}
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_COLOR[po.status] ?? "secondary"}>
                    {t(`pharmacy.${STATUS_KEY[po.status] ?? "statusDraft"}`)}
                  </Badge>
                  <PoStatusActions poId={po.id} status={po.status} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>
                  {t("pharmacy.total")}:{" "}
                  <b className="tabular-nums text-foreground">
                    {Number(po.total.toNumber()).toLocaleString(locale === "ar" ? "ar-YE" : "en-US")} YER
                  </b>
                </span>
                <span>
                  {t("pharmacy.orderedDate")}:{" "}
                  {po.orderedAt.toLocaleDateString(locale === "ar" ? "ar-YE" : "en-US")}
                </span>
                {po.warehouse ? (
                  <span>{patientName(po.warehouse.nameAr, po.warehouse.nameEn)}</span>
                ) : null}
                <span>
                  {t("pharmacy.quantity")}: {po.items.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
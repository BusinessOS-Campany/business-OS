import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Boxes, Layers, History, AlertTriangle, Clock3 } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getInventoryItemById, getWarehouses } from "@/lib/services/pharmacy";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdjustStockForm } from "@/features/pharmacy/adjust-stock-form";

export const metadata = { title: "Item" };

const MOVEMENT_KEY: Record<string, string> = {
  PURCHASE: "PURCHASE",
  RECEIPT: "RECEIPT",
  TRANSFER_IN: "TRANSFER_IN",
  TRANSFER_OUT: "TRANSFER_OUT",
  CONSUMPTION: "CONSUMPTION",
  DISPENSE: "DISPENSE",
  ISSUE: "ISSUE",
  RETURN: "RETURN",
  ADJUSTMENT: "ADJUSTMENT",
  EXPIRY: "EXPIRY",
  WASTAGE: "WASTAGE",
  INITIAL: "INITIAL",
};

const MOVEMENT_COLOR: Record<string, "success" | "warning" | "secondary" | "info" | "destructive"> = {
  PURCHASE: "success",
  RECEIPT: "success",
  TRANSFER_IN: "info",
  TRANSFER_OUT: "warning",
  CONSUMPTION: "secondary",
  DISPENSE: "info",
  ISSUE: "warning",
  RETURN: "secondary",
  ADJUSTMENT: "warning",
  EXPIRY: "destructive",
  WASTAGE: "destructive",
  INITIAL: "secondary",
};

export default async function MedicineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("pharmacy");
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

  const [item, warehouses] = await Promise.all([getInventoryItemById(id), getWarehouses()]);
  if (!item) notFound();

  const nameOf = item.id
    ? (locale === "ar" ? item.nameAr : item.nameEn)
    : "";
  const breadcrumbs: Crumb[] = [
    { label: t("pharmacy.title"), href: "/pharmacy" },
    { label: t("pharmacy.medicines"), href: "/pharmacy/medicines" },
    { label: nameOf },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={nameOf}
        description={`${item.code} · ${t(`pharmacy.categories.${item.category}`)}`}
        icon={<Boxes />}
        breadcrumbs={breadcrumbs}
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant={item.isLowStock ? "destructive" : "success"} className="gap-1">
          {item.isLowStock ? <AlertTriangle className="size-3" /> : null}
          {t("pharmacy.stock")}: {item.totalStock}
        </Badge>
        <Badge variant="outline">
          {t("pharmacy.reorderLevel")}: {item.reorderLevel}
        </Badge>
        {item.strength ? (
          <Badge variant="outline">{item.strength}</Badge>
        ) : null}
        {item.manufacturer ? (
          <Badge variant="outline">{item.manufacturer}</Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4 text-primary" />
              {t("pharmacy.batch")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {item.batches.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("pharmacy.noBatches")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="py-2 pr-3 text-start">{t("pharmacy.batchNo")}</th>
                      <th className="py-2 pr-3 text-start">{t("pharmacy.expiry")}</th>
                      <th className="py-2 pr-3 text-end">{t("pharmacy.stock")}</th>
                      <th className="py-2 pr-3 text-end">{t("pharmacy.costPrice")}</th>
                      <th className="py-2 text-start">{t("pharmacy.warehouses")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {item.batches.map((b) => (
                      <tr key={b.id}>
                        <td className="py-2.5 pr-3 font-mono text-xs">{b.batchNo}</td>
                        <td className="py-2.5 pr-3">
                          {b.expiryDate ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="size-3 text-muted-foreground" />
                              {b.expiryDate.toISOString().slice(0, 10)}
                              {b.expiryDate.getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000 ? (
                                <Badge variant="warning">{t("pharmacy.expiringSoon")}</Badge>
                              ) : null}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-end font-medium tabular-nums">{b.quantity}</td>
                        <td className="py-2.5 pr-3 text-end tabular-nums">
                          {b.costPrice ? Number(b.costPrice.toNumber()).toLocaleString() : "—"}
                        </td>
                        <td className="py-2.5">
                          {b.warehouse ? (locale === "ar" ? b.warehouse.nameAr : b.warehouse.nameEn) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("pharmacy.adjustStock")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AdjustStockForm
              itemId={item.id}
              batches={item.batches.map((b) => ({
                id: b.id,
                batchNo: b.batchNo,
                quantity: b.quantity,
                expiry: b.expiryDate?.toISOString() ?? null,
                warehouseName: b.warehouse ? (locale === "ar" ? b.warehouse.nameAr : b.warehouse.nameEn) : "",
              }))}
              warehouses={warehouses.map((w) => ({ id: w.id, nameAr: w.nameAr, nameEn: w.nameEn }))}
              locale={locale}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-primary" />
            {t("pharmacy.movements")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {item.movements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("pharmacy.noMovements")}</p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-3 text-start">{t("pharmacy.movementType")}</th>
                    <th className="py-2 pr-3 text-end">{t("pharmacy.quantity")}</th>
                    <th className="py-2 pr-3 text-start">{t("pharmacy.batchNo")}</th>
                    <th className="py-2 pr-3 text-start">{t("common.notes")}</th>
                    <th className="py-2 text-start">{t("common.date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {item.movements.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 pr-3">
                        <Badge variant={MOVEMENT_COLOR[m.type] ?? "secondary"}>
                          {MOVEMENT_KEY[m.type] ?? m.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-end font-medium tabular-nums">
                        <span className={m.quantity < 0 ? "text-destructive" : "text-success"}>
                          {m.quantity > 0 ? "+" : ""}{m.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{m.batch?.batchNo ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground">{m.note ?? "—"}</td>
                      <td className="py-2.5 text-xs text-muted-foreground">{formatDateTime(m.createdAt, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
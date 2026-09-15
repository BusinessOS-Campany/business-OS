import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Printer } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getLabOrderById } from "@/lib/services/laboratory";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LabOrderStatusActions } from "@/features/lab/lab-order-status-actions";
import { LabResultsForm } from "@/features/lab/lab-results-form";

export const metadata = { title: "Lab Order Detail" };

const STATUS_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "destructive"> = {
  ORDERED: "info", COLLECTED: "secondary", RECEIVED: "secondary", PROCESSING: "warning",
  COMPLETED: "success", REVIEWED: "default", CANCELLED: "destructive",
};

export default async function LabOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("laboratory");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const order = await getLabOrderById(id);
  if (!order) notFound();

  const patient = locale === "ar" ? order.patient.nameAr : order.patient.nameEn;
  const doctor = locale === "ar" ? order.doctor?.nameAr : order.doctor?.nameEn;
  const dept = locale === "ar" ? order.encounter?.department?.nameAr : order.encounter?.department?.nameEn;

  const statusLabel: Record<string, string> = {
    ORDERED: t("laboratory.statusOrdered"),
    COLLECTED: t("laboratory.statusCollected"),
    RECEIVED: t("laboratory.statusReceived"),
    PROCESSING: t("laboratory.statusProcessing"),
    COMPLETED: t("laboratory.statusCompleted"),
    REVIEWED: t("laboratory.statusReviewed"),
    CANCELLED: t("laboratory.statusCancelled"),
  };

  const sampleTypes = [...new Set(order.items.map((i) => i.test.sampleType))];

  return (
    <div className="space-y-5">
      <PageHeader
        title={order.orderNo}
        description={patient}
        icon={<Link href="/laboratory/orders" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="size-3.5" />
              {t("common.print")}
            </Button>
            <LabOrderStatusActions orderId={order.id} status={order.status} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">{t("common.patient")}</p>
            <p className="font-medium">{patient}</p>
            <p className="text-xs text-muted-foreground">{order.patient.mrn}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">{t("common.doctor")}</p>
            <p className="font-medium">{doctor ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{dept ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">{t("laboratory.priority")}</p>
            <p><Badge variant={order.priority === "ROUTINE" ? "outline" : order.priority === "STAT" ? "destructive" : "warning"}>{order.priority}</Badge></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">{t("common.status")}</p>
            <p><Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>{statusLabel[order.status] ?? order.status}</Badge></p>
            {order.clinicalNote && <p className="mt-1.5 text-xs text-muted-foreground">{order.clinicalNote}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>{t("laboratory.sampleType")}: {sampleTypes.join(", ")}</span>
        {order.collectedAt && <span>Collected: {new Date(order.collectedAt).toLocaleString()}</span>}
        {order.completedAt && <span>Completed: {new Date(order.completedAt).toLocaleString()}</span>}
        {order.reviewedAt && <span>Reviewed: {new Date(order.reviewedAt).toLocaleString()}</span>}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("laboratory.testCount")} ({order.items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item) => {
            const latestResult = item.results[0] ?? null;
            return (
              <LabResultsForm
                key={item.id}
                item={{
                  id: item.id,
                  testCode: item.test.code,
                  testNameAr: item.test.nameAr,
                  testNameEn: item.test.nameEn,
                  unit: item.test.unit,
                  sampleType: item.test.sampleType,
                  status: item.status,
                  result: latestResult
                    ? {
                        id: latestResult.id,
                        value: latestResult.value,
                        unit: latestResult.unit,
                        refLow: latestResult.refLow,
                        refHigh: latestResult.refHigh,
                        isAbnormal: latestResult.isAbnormal,
                        isCritical: latestResult.isCritical,
                        note: latestResult.note,
                        performedAt: latestResult.createdAt.toISOString(),
                        performedByName: (locale === "ar" ? latestResult.performedBy?.nameAr : latestResult.performedBy?.nameEn) ?? null,
                      }
                    : null,
                }}
                locale={locale}
              />
            );
          })}
          {order.items.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("laboratory.noOrders")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
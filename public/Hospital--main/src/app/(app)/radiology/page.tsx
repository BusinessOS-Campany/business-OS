import Link from "next/link";
import { cookies } from "next/headers";
import { ScanLine, ListChecks, CheckCircle2, FileClock } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getRadOrders, getRadStats } from "@/lib/services/radiology";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { RadOrdersTable, type RadOrderRow } from "@/features/rad/rad-orders-table";

export const metadata = { title: "Radiology" };

export default async function RadiologyPage() {
  await requirePermission("radiology");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [openOrders, stats] = await Promise.all([getRadOrders({ limit: 8 }), getRadStats()]);

  const rows: RadOrderRow[] = openOrders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    patientNameAr: o.patient.nameAr,
    patientNameEn: o.patient.nameEn,
    mrn: o.patient.mrn,
    doctorNameAr: o.doctor?.nameAr ?? null,
    doctorNameEn: o.doctor?.nameEn ?? null,
    modality: o.modality,
    bodyPart: o.bodyPart,
    status: o.status,
    hasReport: !!o.report,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("radiology.title")}
        description={t("radiology.openOrders")}
        icon={<ScanLine />}
        actions={
          <Button asChild size="sm">
            <Link href="/radiology/orders">
              <ListChecks className="size-3.5" />
              {t("radiology.orders")}
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ScanLine} label={t("radiology.openOrders")} value={String(stats.openCount)} variant="info" />
        <StatCard icon={ListChecks} label={t("radiology.ordersToday")} value={String(stats.todayCount)} />
        <StatCard icon={CheckCircle2} label={t("radiology.reportedOrders")} value={String(stats.reportedCount)} variant="success" />
        <StatCard icon={FileClock} label={t("radiology.pendingReport")} value={String(stats.pendingReport)} variant="warning" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-4 text-primary" />
            {t("radiology.openOrders")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("radiology.noOrders")}</p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <RadOrdersTable rows={rows} locale={locale} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import Link from "next/link";
import { cookies } from "next/headers";
import { FileText, ListChecks, CheckCircle2, FlaskConical, Microscope } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getLabOrders, getLabStats, getLabTests } from "@/lib/services/laboratory";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { LabOrdersTable, type LabOrderRow } from "@/features/lab/lab-orders-table";

export const metadata = { title: "Laboratory" };

export default async function LaboratoryPage() {
  await requirePermission("laboratory");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [openOrders, stats, activeTests] = await Promise.all([
    getLabOrders({ limit: 8 }),
    getLabStats(),
    getLabTests({ activeOnly: true }),
  ]);

  const rows: LabOrderRow[] = openOrders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    patientNameAr: o.patient.nameAr,
    patientNameEn: o.patient.nameEn,
    mrn: o.patient.mrn,
    doctorNameAr: o.doctor?.nameAr ?? null,
    doctorNameEn: o.doctor?.nameEn ?? null,
    priority: o.priority,
    status: o.status,
    itemCount: o.items.length,
    resultCount: o.items.filter((i) => i.results.length > 0).length,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("laboratory.title")}
        description={t("laboratory.openOrders")}
        icon={<Microscope />}
        actions={
          <Button asChild size="sm">
            <Link href="/laboratory/orders">
              <ListChecks className="size-3.5" />
              {t("laboratory.orders")}
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={FlaskConical} label={t("laboratory.openOrders")} value={String(stats.openCount)} variant="info" />
        <StatCard icon={FileText} label={t("laboratory.ordersToday")} value={String(stats.todayCount)} />
        <StatCard icon={CheckCircle2} label={t("laboratory.reviewedOrders")} value={String(stats.reviewedCount)} variant="success" />
        <StatCard icon={FlaskConical} label={t("laboratory.activeTests")} value={String(stats.testCount)} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-primary" />
              {t("laboratory.openOrders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("laboratory.noOrders")}</p>
            ) : (
              <div className="max-h-96 overflow-auto">
                <LabOrdersTable rows={rows} locale={locale} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4 text-primary" />
              {t("laboratory.activeTests")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTests.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("laboratory.noOrders")}</p>
            ) : (
              <ul className="divide-y">
                {activeTests.slice(0, 12).map((test) => (
                  <li key={test.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="truncate text-sm">{locale === "ar" ? test.nameAr : test.nameEn}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{test.code}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/laboratory/catalog" className="gap-1.5">
                  <FlaskConical className="size-3.5" />
                  {t("laboratory.viewCatalog")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
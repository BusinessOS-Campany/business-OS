import { cookies } from "next/headers";
import { Wrench, ClipboardList, CalendarClock, Activity, CheckCircle2 } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getMaintenanceRequests, getMaintenanceStats, getMaintenanceOptions } from "@/lib/services/maintenance";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { MaintenanceTable, type MaintenanceRow } from "@/features/maintenance/maintenance-table";
import { MaintenanceForm } from "@/features/maintenance/maintenance-form";

export const metadata = { title: "Maintenance" };

export default async function MaintenancePage() {
  await requirePermission("maintenance");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [requests, stats, options] = await Promise.all([
    getMaintenanceRequests({ limit: 50 }),
    getMaintenanceStats(),
    getMaintenanceOptions(),
  ]);

  const rows: MaintenanceRow[] = requests.map((r) => ({
    id: r.id,
    requestNo: r.requestNo,
    assetNo: r.asset.assetNo,
    assetNameAr: r.asset.nameAr,
    assetNameEn: r.asset.nameEn ?? "",
    type: r.type,
    status: r.status,
    technicianNameAr: r.technician?.nameAr ?? null,
    technicianNameEn: r.technician?.nameEn ?? null,
    scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
    cost: r.cost != null ? Number(r.cost) : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("maintenance.title")}
        description={t("maintenance.requests")}
        icon={<Wrench />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Wrench} label={t("common.total")} value={String(stats.total)} variant="default" />
        <StatCard icon={ClipboardList} label={t("maintenance.statusRequested")} value={String(stats.requested)} variant="warning" />
        <StatCard icon={CalendarClock} label={t("maintenance.statusScheduled")} value={String(stats.scheduled)} variant="info" />
        <StatCard icon={Activity} label={t("maintenance.statusInProgress")} value={String(stats.inProgress)} variant="danger" />
        <StatCard icon={CheckCircle2} label={t("maintenance.statusCompleted")} value={String(stats.completed)} variant="success" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <MaintenanceForm locale={locale} assets={options.assets} employees={options.employees} />
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="size-4 text-primary" />
                {t("maintenance.requests")} ({rows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("maintenance.noRequests")}</p>
              ) : (
                <MaintenanceTable rows={rows} locale={locale} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import Link from "next/link";
import { cookies } from "next/headers";
import { Scissors, CalendarPlus, CalendarClock, Activity, CheckCircle2, HeartPulse, DoorOpen } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getSurgeries, getSurgeryStats } from "@/lib/services/surgery";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { SurgeryTable, type SurgeryRow } from "@/features/surgery/surgery-table";

export const metadata = { title: "Surgery" };

export default async function SurgeryPage() {
  await requirePermission("surgery");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [surgeries, stats] = await Promise.all([getSurgeries({ limit: 50 }), getSurgeryStats()]);

  const rows: SurgeryRow[] = surgeries.map((s) => ({
    id: s.id,
    surgeryNo: s.surgeryNo,
    patientNameAr: s.patient.nameAr,
    patientNameEn: s.patient.nameEn,
    mrn: s.patient.mrn,
    procedureNameAr: s.procedureNameAr,
    procedureNameEn: s.procedureNameEn,
    surgeonNameAr: s.surgeon?.nameAr ?? null,
    surgeonNameEn: s.surgeon?.nameEn ?? null,
    roomNameAr: s.operatingRoom?.nameAr ?? null,
    roomNameEn: s.operatingRoom?.nameEn ?? null,
    status: s.status,
    scheduledAt: s.scheduledAt ? s.scheduledAt.toISOString() : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("surgery.title")}
        description={t("surgery.todaySurgeries")}
        icon={<Scissors />}
        actions={
          <Button asChild size="sm">
            <Link href="/surgery/schedule">
              <CalendarPlus className="size-4" /> {t("surgery.newSurgery")}
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={CalendarClock} label={t("surgery.scheduledCount")} value={String(stats.scheduled)} variant="info" />
        <StatCard icon={Activity} label={t("surgery.inProgressCount")} value={String(stats.inProgress)} variant="danger" />
        <StatCard icon={CheckCircle2} label={t("common.today")} value={String(stats.completedToday)} variant="success" />
        <StatCard icon={HeartPulse} label={t("surgery.postOpCount")} value={String(stats.postOp)} variant="default" />
        <StatCard icon={DoorOpen} label={t("surgery.rooms")} value={String(stats.orCount)} variant="primary" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scissors className="size-4 text-primary" />
            {t("surgery.title")} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("surgery.newSurgery")}</p>
          ) : (
            <SurgeryTable rows={rows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
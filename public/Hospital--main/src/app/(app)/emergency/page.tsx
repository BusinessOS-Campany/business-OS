import Link from "next/link";
import { cookies } from "next/headers";
import { Siren, Users, UserCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getEmergencyEncounters, getEmergencyStats } from "@/lib/services/emergency";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmergencyPatientsTable, type EmergencyRow } from "@/features/emergency/emergency-patients-table";

export const metadata = { title: "Emergency" };

export default async function EmergencyPage() {
  await requirePermission("emergency");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [patients, stats] = await Promise.all([
    getEmergencyEncounters(),
    getEmergencyStats(),
  ]);

  const rows: EmergencyRow[] = patients.map((e) => ({
    id: e.id,
    encounterNo: e.encounterNo,
    patientNameAr: e.patient.nameAr,
    patientNameEn: e.patient.nameEn,
    mrn: e.patient.mrn,
    triageLevel: e.triageLevel,
    status: e.status,
    doctorNameAr: e.doctor?.nameAr ?? null,
    doctorNameEn: e.doctor?.nameEn ?? null,
    chiefComplaint: e.chiefComplaint,
    createdAt: e.createdAt.toISOString(),
    latestVital: e.vitals[0] ? { pulse: e.vitals[0].pulse, systolic: e.vitals[0].systolic } : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("emergency.title")}
        description={t("emergency.emergencyBoard")}
        icon={<Siren />}
        actions={
          <Button asChild size="sm">
            <Link href="/patients/new">{t("emergency.registerPatient")}</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label={t("emergency.waitingCount")} value={String(stats.waitingCount)} variant="warning" />
        <StatCard icon={UserCheck} label={t("emergency.inConsultationCount")} value={String(stats.inConsultCount)} variant="info" />
        <StatCard icon={CheckCircle2} label={t("emergency.completedTodayCount")} value={String(stats.completedToday)} variant="success" />
        <StatCard icon={AlertTriangle} label={t("emergency.criticalCount")} value={String(stats.criticalCount)} variant="danger" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Siren className="size-4 text-primary" />
            {t("emergency.patients")} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("emergency.patients")}</p>
          ) : (
            <EmergencyPatientsTable rows={rows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
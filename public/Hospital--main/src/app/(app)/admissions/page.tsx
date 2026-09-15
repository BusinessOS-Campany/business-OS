import Link from "next/link";
import { cookies } from "next/headers";
import { BedDouble, Stethoscope, Activity, CheckCircle2, Clock, Layers } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getAdmissions, getAdmissionStats, getBedBoard } from "@/lib/services/admissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { AdmissionsTable, type AdmissionRow } from "@/features/admissions/admissions-table";

export const metadata = { title: "Inpatients" };

export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; status?: string }>;
}) {
  await requirePermission("admissions");
  const params = searchParams ? await searchParams : {};
  const icuMode = params.type === "icu";

  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [{ admitted, icu, availableBeds, admittedToday, expectedSoon }, beds, admissions] = await Promise.all([
    getAdmissionStats(),
    getBedBoard(),
    getAdmissions({ icu: icuMode, limit: 100 }),
  ]);

  const rows: AdmissionRow[] = admissions.map((a) => ({
    id: a.id,
    admissionNo: a.admissionNo,
    patientNameAr: a.patient.nameAr,
    patientNameEn: a.patient.nameEn,
    mrn: a.patient.mrn,
    departmentNameAr: a.department?.nameAr ?? null,
    departmentNameEn: a.department?.nameEn ?? null,
    bedCode: a.bed?.code ?? null,
    roomNameAr: a.bed?.room?.nameAr ?? null,
    roomNameEn: a.bed?.room?.nameEn ?? null,
    doctorNameAr: a.attendingDoctor?.nameAr ?? null,
    doctorNameEn: a.attendingDoctor?.nameEn ?? null,
    status: a.status,
    isIcu: a.isIcu,
    admittedAt: a.admittedAt.toISOString(),
  }));

  const chip = (label: string, href: string, active = false) => (
    <Link href={href}>
      <Badge variant={active ? "default" : "outline"} className="cursor-pointer hover:shadow-sm">
        {label}
      </Badge>
    </Link>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={t(icuMode ? "nav.icu" : "admissions.title")}
        description={t("admissions.title")}
        icon={icuMode ? <Activity /> : <BedDouble />}
        actions={
          <Button asChild size="sm">
            <Link href="/admissions/new">
              <Stethoscope className="size-4" /> {t("admissions.new")}
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={BedDouble} label={t("admissions.statusAdmitted")} value={String(admitted)} variant="success" />
        <StatCard icon={Activity} label={t("admissions.icu")} value={String(icu)} variant="danger" />
        <StatCard icon={Layers} label={t("admissions.availableBeds")} value={String(availableBeds)} variant="info" />
        <StatCard icon={Clock} label={t("admissions.admitsToday")} value={String(admittedToday)} variant="primary" />
        <StatCard icon={CheckCircle2} label={t("admissions.expectedSoon")} value={String(expectedSoon)} variant="warning" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["admissions.availableBeds", beds.available, "text-emerald-600", "bg-emerald-500"],
          ["admissions.occupiedBeds", beds.occupied, "text-amber-600", "bg-amber-500"],
          ["admissions.cleaningBeds", beds.cleaning, "text-blue-600", "bg-blue-500"],
          ["admissions.maintenanceBeds", beds.maintenance, "text-muted-foreground", "bg-muted-foreground/30"],
          ["admissions.blockedBeds", beds.blocked, "text-destructive", "bg-destructive/30"],
        ].map(([labelKey, count, textColor, bgColor]) => (
          <div key={labelKey as string} className="rounded border p-3">
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${bgColor}`} />
              <span className="text-xs text-muted-foreground">{t(labelKey as string)}</span>
            </div>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${textColor}`}>{count}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {chip(t("common.all"), `/admissions${icuMode ? "" : ""}`, !icuMode && !params.status)}
        {chip(t("admissions.icu"), "/admissions?type=icu", icuMode)}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BedDouble className="size-4 text-primary" />
            {t(icuMode ? "admissions.icu" : "admissions.title")} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("admissions.noAdmissions")}</p>
          ) : (
            <AdmissionsTable rows={rows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
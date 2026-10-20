import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, User, CalendarClock, Stethoscope, ClipboardList, HeartPulse } from "lucide-react";
import { cookies } from "next/headers";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getAdmissionById } from "@/lib/services/admissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DischargeForm, CancelAdmissionButton } from "@/features/admissions/discharge-form";
import { CarePlanForm } from "@/features/admissions/care-plan-form";

const STATUS_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "muted" | "destructive"> = {
  ADMITTED: "success",
  DISCHARGED: "muted",
  TRANSFERRED: "info",
  CANCELLED: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  ADMITTED: "admissions.statusAdmitted",
  DISCHARGED: "admissions.statusDischarged",
  TRANSFERRED: "admissions.statusTransferred",
  CANCELLED: "admissions.statusCancelled",
};

export const metadata = { title: "Admission" };

export default async function AdmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("admissions");
  const { id } = await params;

  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const admission = await getAdmissionById(id);
  if (!admission) notFound();

  const fmt = (d: Date | string | null | undefined) => (d ? new Date(d).toLocaleString() : "—");
  const patientName = locale === "ar" ? admission.patient.nameAr : admission.patient.nameEn;
  const doctorName = admission.attendingDoctor ? (locale === "ar" ? admission.attendingDoctor.nameAr : admission.attendingDoctor.nameEn) : null;
  const deptName = admission.department ? (locale === "ar" ? admission.department.nameAr : admission.department.nameEn) : null;
  const bedInfo = admission.bed
    ? `${admission.bed.code}${admission.bed.room ? " · " + (locale === "ar" ? admission.bed.room.nameAr : admission.bed.room.nameEn) : ""}`
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${admission.admissionNo} · ${patientName}`}
        description={t("admissions.title")}
        icon={<BedDouble />}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admissions">
              <ArrowLeft className="size-4" /> {t("common.back")}
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <Badge variant={STATUS_VARIANT[admission.status] ?? "outline"}>{t(STATUS_LABEL[admission.status] ?? admission.status)}</Badge>
        {admission.isIcu && <Badge variant="destructive">ICU</Badge>}
        {admission.admissionNo && <span className="text-muted-foreground text-xs">{admission.admissionNo}</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4 text-primary" />
              {t("common.patient")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">MRN</span><span>{admission.patient.mrn}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("common.gender")}</span><span>{admission.patient.gender ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("common.phone")}</span><span>{admission.patient.phone ?? "—"}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="size-4 text-primary" />
              {t("admissions.room")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("admissions.department")}</span><span>{deptName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("admissions.bedCode")}</span><span>{bedInfo ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("admissions.attendings")}</span><span>{doctorName ?? "—"}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" />
              {t("admissions.admittedAt")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("admissions.admittedAt")}</span><span>{fmt(admission.admittedAt)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("admissions.expectedDischarge")}</span><span>{fmt(admission.expectedDischargeAt)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("admissions.admissionType")}</span><span>{admission.admissionType}</span></div>
            {admission.dischargedAt && (
              <div className="flex justify-between"><span className="text-muted-foreground">{t("admissions.discharge")}</span><span>{fmt(admission.dischargedAt)}</span></div>
            )}
          </CardContent>
        </Card>
        {admission.status === "ADMITTED" && (
          <CarePlanForm
            admissionId={admission.id}
            initialDiagnosis={admission.provisionalDiagnosis}
            initialCarePlan={admission.carePlan}
          />
        )}
        {admission.status === "ADMITTED" && (
          <div className="space-y-3">
            <DischargeForm admissionId={admission.id} />
            <CancelAdmissionButton admissionId={admission.id} />
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4 text-primary" />
            {t("admissions.nursing")}
            {admission.status === "ADMITTED" && (
              <Button asChild variant="link" size="sm" className="ml-auto h-auto p-0 text-xs">
                <Link href={`/nursing?admission=${admission.id}`}>{t("nursing.addNote")}</Link>
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {admission.nursingNotes.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">{t("nursing.noNotes")}</p>
          ) : (
            <div className="space-y-2 text-sm">
              {admission.nursingNotes.map((n) => (
                <div key={n.id} className="rounded border p-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary">{t(`nursing.cat${n.category}`)}</Badge>
                    <span className="text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                    {n.author && <span className="text-muted-foreground">— {locale === "ar" ? n.author.nameAr : n.author.nameEn}</span>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{n.note}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
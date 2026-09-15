import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Scissors, ArrowLeft, User, Stethoscope, Syringe, DoorOpen, CalendarClock } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getSurgeryById } from "@/lib/services/surgery";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SurgeryStatusActions } from "@/features/surgery/surgery-status-actions";

const STATUS_VARIANT: Record<string, "info" | "warning" | "destructive" | "success" | "muted" | "default" | "outline"> = {
  SCHEDULED: "info",
  PRE_OP: "warning",
  IN_PROGRESS: "destructive",
  COMPLETED: "success",
  CANCELLED: "muted",
  POST_OP: "default",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "surgery.statusScheduled",
  PRE_OP: "surgery.statusPreOp",
  IN_PROGRESS: "surgery.statusInProgress",
  COMPLETED: "surgery.statusCompleted",
  CANCELLED: "surgery.statusCancelled",
  POST_OP: "surgery.statusPostOp",
};

export default async function SurgeryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("surgery");
  const { id } = await params;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const surgery = await getSurgeryById(id);
  if (!surgery) notFound();

  const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB") : "—");

  const sections: Array<{ label: string; value: string | null | undefined }> = [
    { label: t("surgery.preOpChecklist"), value: surgery.preOpChecklist },
    { label: t("surgery.intraoperativeNotes"), value: surgery.intraoperativeNotes },
    { label: t("surgery.anesthesiaRecord"), value: surgery.anesthesiaRecord },
    { label: t("surgery.surgicalNotes"), value: surgery.surgicalNotes },
    { label: t("surgery.implants"), value: surgery.implants },
    { label: t("surgery.complications"), value: surgery.complications },
    { label: t("surgery.recoveryNotes"), value: surgery.recoveryNotes },
  ].filter((s) => s.value);

  return (
    <div className="space-y-5">
      <PageHeader
        title={surgery.surgeryNo}
        description={`${surgery.procedureNameAr}${surgery.procedureNameEn ? " · " + surgery.procedureNameEn : ""}`}
        icon={<Scissors />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[surgery.status] ?? "outline"}>{t(STATUS_LABEL[surgery.status] ?? surgery.status)}</Badge>
            {surgery.status !== "CANCELLED" && <SurgeryStatusActions surgeryId={surgery.id} status={surgery.status} />}
            <Button asChild variant="outline" size="sm">
              <Link href="/surgery">
                <ArrowLeft className="size-4" /> {t("common.back")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("surgery.staff")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("common.doctor")}</p>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Stethoscope className="size-4 text-primary" />
                  {surgery.surgeon ? (locale === "ar" ? surgery.surgeon.nameAr : surgery.surgeon.nameEn) : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("surgery.anesthesiologist")}</p>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Syringe className="size-4 text-primary" />
                  {surgery.anesthesiologist ? (locale === "ar" ? surgery.anesthesiologist.nameAr : surgery.anesthesiologist.nameEn) : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("surgery.operatingRooms")}</p>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <DoorOpen className="size-4 text-primary" />
                  {surgery.operatingRoom ? `${surgery.operatingRoom.code} — ${locale === "ar" ? surgery.operatingRoom.nameAr : surgery.operatingRoom.nameEn}` : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          {sections.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}

          {sections.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">{t("surgery.title")}</CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("common.patient")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium">
                <User className="size-4 text-primary" />
                {locale === "ar" ? surgery.patient.nameAr : surgery.patient.nameEn}
              </p>
              <p className="text-muted-foreground">
                {surgery.patient.mrn}
                {surgery.patient.phone ? " · " + surgery.patient.phone : ""}
              </p>
              {surgery.admission && (
                <p className="text-muted-foreground">
                  {t("admissions.title")}:{" "}
                  <Link href={`/admissions/${surgery.admission.id}`} className="font-medium text-primary hover:underline">
                    {surgery.admission.admissionNo}
                  </Link>
                </p>
              )}

              <div className="space-y-1 border-t pt-3 text-sm">
                <p className="text-xs text-muted-foreground">{t("surgery.scheduledAt")}</p>
                <p className="flex items-center gap-1.5 font-medium">
                  <CalendarClock className="size-4 text-primary" />
                  {fmt(surgery.scheduledAt)}
                </p>
              </div>
              {surgery.startedAt && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("surgery.statusInProgress")}</p>
                  <p className="font-medium">{fmt(surgery.startedAt)}</p>
                </div>
              )}
              {surgery.endedAt && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("surgery.statusCompleted")}</p>
                  <p className="font-medium">{fmt(surgery.endedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
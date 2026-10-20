import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  CalendarClock,
  UserRound,
  Stethoscope,
  Building2,
  Clock3,
  Hash,
  Ticket,
  FileText,
  Phone,
} from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getAppointmentById } from "@/lib/services/appointments";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppointmentStatusActions } from "@/features/appointments/appointment-status-actions";

export const metadata = { title: "Appointment" };

const STATUS_KEY: Record<string, string> = {
  SCHEDULED: "statusScheduled",
  CONFIRMED: "statusConfirmed",
  ARRIVED: "statusArrived",
  WAITING: "statusWaiting",
  IN_CONSULTATION: "statusInConsultation",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
  NO_SHOW: "statusNoShow",
};

type BadgeVariant = "info" | "default" | "destructive" | "outline" | "secondary" | "success" | "warning" | "muted";

const STATUS_COLOR: Record<string, BadgeVariant> = {
  SCHEDULED: "outline",
  CONFIRMED: "secondary",
  ARRIVED: "default",
  WAITING: "default",
  IN_CONSULTATION: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

const TYPE_KEY: Record<string, string> = {
  OUTPATIENT: "typeOutpatient",
  FOLLOW_UP: "typeFollowUp",
  EMERGENCY: "typeEmergency",
  PROCEDURE: "typeProcedure",
  INPATIENT: "typeInpatient",
};

const PRIORITY_KEY: Record<string, string> = {
  ROUTINE: "priorityRoutine",
  URGENT: "priorityUrgent",
  EMERGENCY: "priorityEmergency",
  STAT: "priorityStat",
};

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border bg-muted/20 px-3 py-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("appointments");
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

  const appointment = await getAppointmentById(id);
  if (!appointment) notFound();

  const patientName = locale === "ar" ? appointment.patient.nameAr : appointment.patient.nameEn;
  const doctor = appointment.doctor
    ? `${locale === "ar" ? appointment.doctor.nameAr : appointment.doctor.nameEn}${appointment.doctor.specialty ? ` · ${locale === "ar" ? appointment.doctor.specialty.nameAr : appointment.doctor.specialty.nameEn}` : ""}`
    : null;

  const breadcrumbs: Crumb[] = [
    { label: t("appointments.list"), href: "/appointments" },
    { label: appointment.appointmentNo },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={appointment.appointmentNo}
        description={formatDateTime(appointment.scheduledAt, locale)}
        icon={<CalendarClock />}
        breadcrumbs={breadcrumbs}
        actions={<AppointmentStatusActions appointmentId={appointment.id} currentStatus={appointment.status} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("appointments.detailsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field icon={<UserRound className="size-4" />} label={t("appointments.bookedFor")} value={patientName} />
            <Field icon={<Stethoscope className="size-4" />} label={t("appointments.doctorLabel")} value={doctor} />
            <Field
              icon={<Building2 className="size-4" />}
              label={t("appointments.departmentLabel")}
              value={locale === "ar" ? appointment.department?.nameAr : appointment.department?.nameEn}
            />
            <Field icon={<Clock3 className="size-4" />} label={t("appointments.scheduledAt")} value={formatDateTime(appointment.scheduledAt, locale)} />
            <Field icon={<Clock3 className="size-4" />} label={t("appointments.duration")} value={`${appointment.durationMinutes} ${t("appointments.minutes")}`} />
            <Field
              icon={<FileText className="size-4" />}
              label={t("appointments.type")}
              value={t(`appointments.${TYPE_KEY[appointment.appointmentType] ?? "typeOutpatient"}`)}
            />
            <Field
              icon={<Hash className="size-4" />}
              label={t("appointments.priority")}
              value={t(`appointments.${PRIORITY_KEY[appointment.priority] ?? "priorityRoutine"}`)}
            />
            <Field icon={<Ticket className="size-4" />} label={t("appointments.queueTicket")} value={appointment.queueTicket?.ticketNo ?? t("appointments.noQueueTicket")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("appointments.bookedFor")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-11">
                <AvatarFallback>{patientName?.charAt(0) ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{patientName}</p>
                <p className="truncate text-xs text-muted-foreground tabular-nums">{appointment.patient.mrn}</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
              <span className="text-sm text-muted-foreground">{t("appointments.status")}</span>
              <Badge variant={STATUS_COLOR[appointment.status] ?? "outline"}>
                {t(`appointments.${STATUS_KEY[appointment.status] ?? "statusScheduled"}`)}
              </Badge>
            </div>
            {appointment.patient.phone ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                <Phone className="size-4 text-muted-foreground" />
                <span dir="ltr" className="tabular-nums">{appointment.patient.phone}</span>
              </div>
            ) : null}
            <Button asChild className="w-full" size="sm">
              <Link href={`/patients/${appointment.patient.id}`}>{t("patients.profile")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
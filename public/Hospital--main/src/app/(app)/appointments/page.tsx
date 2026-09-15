import Link from "next/link";
import { cookies } from "next/headers";
import { CalendarClock, CalendarPlus, CalendarX2 } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getAppointments } from "@/lib/services/appointments";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { AppointmentsTable, type AppointmentTableRow } from "@/features/appointments/appointments-table";

export const metadata = { title: "Appointments" };

function toLocalDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDay(s: string | undefined): Date {
  if (!s) return new Date();
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  await requirePermission("appointments");
  const { d } = await searchParams;
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

  const day = parseDay(d);
  const from = new Date(day);
  from.setHours(0, 0, 0, 0);
  const to = new Date(day);
  to.setHours(23, 59, 59, 999);

  const appointments = await getAppointments(from, to);

  const rows: AppointmentTableRow[] = appointments.map((a) => ({
    id: a.id,
    appointmentNo: a.appointmentNo,
    patientId: a.patientId,
    patientNameAr: a.patient.nameAr,
    patientNameEn: a.patient.nameEn,
    patientMrn: a.patient.mrn,
    doctorNameAr: a.doctor?.nameAr ?? null,
    doctorNameEn: a.doctor?.nameEn ?? null,
    departmentNameAr: a.department?.nameAr ?? null,
    departmentNameEn: a.department?.nameEn ?? null,
    scheduledAt: a.scheduledAt.toISOString(),
    durationMinutes: a.durationMinutes,
    status: a.status,
    priority: a.priority,
    appointmentType: a.appointmentType,
    queueTicket: a.queueTicket?.ticketNo ?? null,
  }));

  const prevDay = new Date(day);
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);
  const isToday = toLocalDay(new Date()) === toLocalDay(day);

  const dateLabel = day.toLocaleDateString(locale === "ar" ? "ar-YE" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("appointments.list")}
        description={dateLabel}
        icon={<CalendarClock />}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/appointments?d=${toLocalDay(prevDay)}`}>
                <CalendarX2 className="size-3.5" />
                {t("common.previous")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={isToday}>
              <Link href="/appointments">{t("common.today")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/appointments?d=${toLocalDay(nextDay)}`}>
                {t("common.next")}
                <CalendarX2 className="size-3.5 rtl:rotate-180" />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/appointments/new">
                <CalendarPlus className="size-3.5" />
                {t("appointments.new")}
              </Link>
            </Button>
          </>
        }
      />
      <AppointmentsTable rows={rows} locale={locale} />
    </div>
  );
}
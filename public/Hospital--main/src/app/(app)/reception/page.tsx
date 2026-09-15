import Link from "next/link";
import { cookies } from "next/headers";
import { LayoutDashboard, CalendarPlus, MonitorPlay } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getQueueBoard, getReceptionAppointments } from "@/lib/services/reception";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { QueueBoard } from "@/features/reception/queue-board";

export const metadata = { title: "Reception Desk" };

export default async function ReceptionPage() {
  await requirePermission("reception");
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

  const [board, appointments] = await Promise.all([getQueueBoard(), getReceptionAppointments()]);

  const rows = appointments.map((a) => ({
    id: a.id,
    appointmentNo: a.appointmentNo,
    scheduledAt: a.scheduledAt.toISOString(),
    status: a.status,
    patient: {
      id: a.patient.id,
      mrn: a.patient.mrn,
      nameAr: a.patient.nameAr,
      nameEn: a.patient.nameEn,
    },
    doctor: a.doctor
      ? { id: a.doctor.id, nameAr: a.doctor.nameAr, nameEn: a.doctor.nameEn }
      : null,
    queueTicket: a.queueTicket
      ? { id: a.queueTicket.id, ticketNo: a.queueTicket.ticketNo, status: a.queueTicket.status }
      : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("reception.title")}
        description={new Date().toLocaleDateString(locale === "ar" ? "ar-YE" : "en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        icon={<LayoutDashboard />}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/reception/display">
                <MonitorPlay className="size-3.5" />
                {t("reception.tvDisplay")}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/appointments/new">
                <CalendarPlus className="size-3.5" />
                {t("reception.createAppointment")}
              </Link>
            </Button>
          </>
        }
      />
      <QueueBoard nowServing={board.nowServing} waiting={board.waiting} appointments={rows} locale={locale} />
    </div>
  );
}
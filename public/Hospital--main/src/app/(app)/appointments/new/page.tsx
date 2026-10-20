import Link from "next/link";
import { cookies } from "next/headers";
import { CalendarPlus2 } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import {
  getAppointmentPatients,
  getDoctors,
  getDepartments,
} from "@/lib/services/appointments";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { AppointmentForm } from "@/features/appointments/appointment-form";

export const metadata = { title: "New Appointment" };

export default async function NewAppointmentPage() {
  await requirePermission("appointments", "create");
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

  const [patients, doctors, departments] = await Promise.all([
    getAppointmentPatients(),
    getDoctors(),
    getDepartments(),
  ]);

  const breadcrumbs: Crumb[] = [
    { label: t("appointments.list"), href: "/appointments" },
    { label: t("appointments.createdTitle") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("appointments.createdTitle")}
        description={t("appointments.createdHint")}
        icon={<CalendarPlus2 />}
        breadcrumbs={breadcrumbs}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/appointments">{t("appointments.backToList")}</Link>
          </Button>
        }
      />
      <AppointmentForm patients={patients} doctors={doctors} departments={departments} locale={locale} />
    </div>
  );
}
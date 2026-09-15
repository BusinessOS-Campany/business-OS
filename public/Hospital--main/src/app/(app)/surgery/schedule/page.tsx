import { cookies } from "next/headers";
import { CalendarPlus } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getOperatingRooms, getSurgeons, getAnesthesiologists } from "@/lib/services/surgery";
import { getAppointmentPatients } from "@/lib/services/appointments";
import { PageHeader } from "@/components/ui/page-header";
import { SurgeryForm } from "@/features/surgery/surgery-form";

export const metadata = { title: "Schedule Surgery" };

export default async function SurgerySchedulePage() {
  await requirePermission("surgery");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [patients, rooms, surgeons, anesthesiologists] = await Promise.all([
    getAppointmentPatients(),
    getOperatingRooms(),
    getSurgeons(),
    getAnesthesiologists(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("surgery.newSurgery")}
        description={t("surgery.schedule")}
        icon={<CalendarPlus />}
      />
      <div className="mx-auto max-w-xl">
        <SurgeryForm
          locale={locale}
          patients={patients}
          rooms={rooms}
          surgeons={surgeons}
          anesthesiologists={anesthesiologists}
        />
      </div>
    </div>
  );
}
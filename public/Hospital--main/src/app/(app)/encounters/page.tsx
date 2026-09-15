import { cookies } from "next/headers";
import { Stethoscope } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getEncounterBoard, getUnattendedTickets } from "@/lib/services/encounters";
import { PageHeader } from "@/components/ui/page-header";
import { EncounterBoard } from "@/features/encounters/encounter-board";

export const metadata = { title: "Outpatient Consultations" };

export default async function EncountersPage() {
  await requirePermission("encounters");
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

  const [encounters, tickets] = await Promise.all([getEncounterBoard(), getUnattendedTickets()]);

  const encRows = encounters.map((e) => ({
    id: e.id,
    encounterNo: e.encounterNo,
    status: e.status,
    createdById: e.createdById,
    patient: { id: e.patient.id, mrn: e.patient.mrn, nameAr: e.patient.nameAr, nameEn: e.patient.nameEn },
    doctor: e.doctor ? { id: e.doctor.id, nameAr: e.doctor.nameAr, nameEn: e.doctor.nameEn } : null,
    department: e.department ? { id: e.department.id, nameAr: e.department.nameAr, nameEn: e.department.nameEn } : null,
  }));

  const ticketRows = tickets.map((tk) => ({
    id: tk.id,
    ticketNo: tk.ticketNo,
    status: tk.status,
    patient: { id: tk.patient.id, mrn: tk.patient.mrn, nameAr: tk.patient.nameAr, nameEn: tk.patient.nameEn },
    department: tk.department ? { id: tk.department.id, nameAr: tk.department.nameAr, nameEn: tk.department.nameEn } : null,
    appointment: tk.appointment
      ? {
          id: tk.appointment.id,
          appointmentNo: tk.appointment.appointmentNo,
          doctor: tk.appointment.doctor
            ? { id: tk.appointment.doctor.id, nameAr: tk.appointment.doctor.nameAr, nameEn: tk.appointment.doctor.nameEn }
            : null,
          encounter: tk.appointment.encounter
            ? { id: tk.appointment.encounter.id, encounterNo: tk.appointment.encounter.encounterNo }
            : null,
        }
      : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("encounters.list")}
        description={t("encounters.board")}
        icon={<Stethoscope />}
      />
      <EncounterBoard tickets={ticketRows} encounters={encRows} locale={locale} />
    </div>
  );
}
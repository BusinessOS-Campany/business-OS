import { ArrowLeft, BedDouble } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getAdmissionPatients, getAvailableBeds, getAttendingDoctors } from "@/lib/services/admissions";
import { getDepartments } from "@/lib/services/appointments";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { AdmissionForm } from "@/features/admissions/admission-form";

export const metadata = { title: "Admit Patient" };

export default async function NewAdmissionPage() {
  await requirePermission("admissions", "create");

  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [patients, beds, doctors, departments] = await Promise.all([
    getAdmissionPatients(),
    getAvailableBeds(),
    getAttendingDoctors(),
    getDepartments(),
  ]);

  const bedRows = beds.map((b) => ({
    id: b.id,
    code: b.code,
    roomNameAr: b.room.nameAr,
    roomNameEn: b.room.nameEn,
    roomCode: b.room.code,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("admissions.new")}
        icon={<BedDouble />}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admissions">
              <ArrowLeft className="size-4" /> {t("common.back")}
            </Link>
          </Button>
        }
      />
      <AdmissionForm
        locale={locale}
        patients={patients}
        beds={bedRows}
        doctors={doctors}
        departments={departments}
      />
    </div>
  );
}
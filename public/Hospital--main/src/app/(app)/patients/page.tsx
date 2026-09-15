import Link from "next/link";
import { cookies } from "next/headers";
import { Users } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getPatientList } from "@/lib/services/patients";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PatientsTable, type PatientTableRow } from "@/features/patients/patients-table";

export const metadata = { title: "Patients" };

export default async function PatientsPage() {
  const user = await requirePermission("patients");
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

  const { patients, total } = await getPatientList(user.branchId);

  const rows: PatientTableRow[] = patients.map((p) => ({
    id: p.id,
    mrn: p.mrn,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    gender: p.gender,
    dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString() : null,
    age: p.age,
    phone: p.phone,
    bloodGroup: p.bloodGroup,
    cityNameAr: p.city?.nameAr ?? null,
    cityNameEn: p.city?.nameEn ?? null,
    govNameAr: p.governorate?.nameAr ?? null,
    govNameEn: p.governorate?.nameEn ?? null,
    appointmentCount: p._count.appointments,
    invoiceCount: p._count.invoices,
    createdAt: p.createdAt.toISOString(),
    patientStatus: p.patientStatus,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("patients.list")}
        description={t("patients.list")}
        icon={<Users />}
        actions={
          <Button asChild size="sm">
            <Link href="/patients/new">{t("patients.registerFirst")}</Link>
          </Button>
        }
      />
      <PatientsTable rows={rows} locale={locale} total={total} />
    </div>
  );
}
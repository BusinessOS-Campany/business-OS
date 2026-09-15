import { cookies } from "next/headers";
import { ClipboardList } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getPendingPrescriptions } from "@/lib/services/pharmacy";
import { PageHeader } from "@/components/ui/page-header";
import { PrescriptionsTable, type PrescriptionRow } from "@/features/pharmacy/prescriptions-table";

export const metadata = { title: "Prescriptions" };

export default async function PharmacyPrescriptionsPage() {
  await requirePermission("prescriptions");
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

  const prescriptions = await getPendingPrescriptions();

  const rows: PrescriptionRow[] = prescriptions.map((p) => ({
    id: p.id,
    prescriptionNo: p.prescriptionNo,
    patientNameAr: p.patient.nameAr,
    patientNameEn: p.patient.nameEn,
    mrn: p.patient.mrn,
    doctorNameAr: p.doctor?.nameAr ?? null,
    doctorNameEn: p.doctor?.nameEn ?? null,
    departmentNameAr: p.encounter?.department?.nameAr ?? null,
    departmentNameEn: p.encounter?.department?.nameEn ?? null,
    createdAt: p.createdAt.toISOString(),
    itemCount: p.items.length,
    dispensedCount: p.items.filter((i) => i.isDispensed).length,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("pharmacy.prescriptions")}
        description={t("pharmacy.pendingDispense")}
        icon={<ClipboardList />}
      />
      <PrescriptionsTable rows={rows} locale={locale} />
    </div>
  );
}
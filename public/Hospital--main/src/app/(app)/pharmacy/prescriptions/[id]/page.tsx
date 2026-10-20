import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ClipboardList, CheckCircle2, CircleAlert } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getPrescriptionById } from "@/lib/services/pharmacy";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DispenseWorkspace, type DispenseItem } from "@/features/pharmacy/dispense-workspace";

export const metadata = { title: "Prescription" };

export default async function PharmacyPrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("pharmacy");
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

  const prescription = await getPrescriptionById(id);
  if (!prescription) notFound();

  const patientName = locale === "ar" ? prescription.patient.nameAr : prescription.patient.nameEn;
  const doctorName = prescription.doctor
    ? locale === "ar"
      ? prescription.doctor.nameAr
      : prescription.doctor.nameEn
    : "—";

  const items: DispenseItem[] = prescription.items.map((pi) => ({
    id: pi.id,
    medicineNameAr: pi.medicineNameAr,
    medicineNameEn: pi.medicineNameEn,
    dosage: pi.dosage,
    frequency: pi.frequency,
    quantity: pi.quantity,
    dispensedQty: pi.dispensedQty,
    unit: pi.item?.unit ?? pi.unit ?? null,
    batches: (pi.item?.batches ?? []).map((b) => ({
      id: b.id,
      batchNo: b.batchNo,
      quantity: b.quantity,
      expiry: b.expiryDate?.toISOString() ?? null,
    })),
  }));

  const breadcrumbs: Crumb[] = [
    { label: t("pharmacy.title"), href: "/pharmacy" },
    { label: t("pharmacy.prescriptions"), href: "/pharmacy/prescriptions" },
    { label: prescription.prescriptionNo },
  ];

  const allDispensed = prescription.items.every((i) => i.isDispensed);

  return (
    <div className="space-y-5">
      <PageHeader
        title={prescription.prescriptionNo}
        description={formatDateTime(prescription.createdAt, locale)}
        icon={<ClipboardList />}
        breadcrumbs={breadcrumbs}
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback>{patientName?.charAt(0) ?? "?"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{patientName}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{prescription.patient.mrn}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {allDispensed ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="size-3" />
                  {t("pharmacy.dispensed")}
                </Badge>
              ) : (
                <Badge variant="info" className="gap-1">
                  <CircleAlert className="size-3" />
                  {t("pharmacy.pendingDispense")}
                </Badge>
              )}
              <Badge variant="outline">{t("encounters.doctorLabel")}: {doctorName}</Badge>
            </div>
          </div>

          {prescription.instructions ? (
            <p className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {t("pharmacy.notes")}: {prescription.instructions}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("pharmacy.dispense")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DispenseWorkspace items={items} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
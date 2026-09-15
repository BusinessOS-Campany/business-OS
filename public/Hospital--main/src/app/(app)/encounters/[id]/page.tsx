import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Stethoscope, UserRound, Hash, Phone } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getEncounterById, getLabTests } from "@/lib/services/encounters";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EncounterWorkspace } from "@/features/encounters/encounter-workspace";

export const metadata = { title: "Consultation" };

function iso(v: Date | string | null | undefined): string | undefined {
  if (!v) return undefined;
  return v instanceof Date ? v.toISOString() : String(v);
}

function dec(v: { toNumber(): number } | number | null | undefined): number | null | undefined {
  if (v === null || v === undefined) return undefined;
  return typeof v === "number" ? v : Number(v.toNumber());
}

export default async function EncounterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const [encounter, labTests] = await Promise.all([getEncounterById(id), getLabTests()]);
  if (!encounter) notFound();

  const patientName = locale === "ar" ? encounter.patient.nameAr : encounter.patient.nameEn;

  const data = {
    id: encounter.id,
    encounterNo: encounter.encounterNo,
    status: encounter.status,
    chiefComplaint: encounter.chiefComplaint ?? undefined,
    hpi: encounter.hpi ?? undefined,
    pastMedicalHistory: encounter.pastMedicalHistory ?? undefined,
    surgicalHistory: encounter.surgicalHistory ?? undefined,
    familyHistory: encounter.familyHistory ?? undefined,
    socialHistory: encounter.socialHistory ?? undefined,
    examination: encounter.examination ?? undefined,
    assessment: encounter.assessment ?? undefined,
    plan: encounter.plan ?? undefined,
    clinicalNotes: encounter.clinicalNotes ?? undefined,
    startedAt: iso(encounter.startedAt),
    completedAt: iso(encounter.completedAt),
    patient: {
      id: encounter.patient.id,
      mrn: encounter.patient.mrn,
      nameAr: encounter.patient.nameAr,
      nameEn: encounter.patient.nameEn,
      gender: encounter.patient.gender,
      age: encounter.patient.age,
      phone: encounter.patient.phone,
      bloodGroup: encounter.patient.bloodGroup,
    },
    doctor: encounter.doctor
      ? { id: encounter.doctor.id, nameAr: encounter.doctor.nameAr, nameEn: encounter.doctor.nameEn }
      : null,
    diagnoses: encounter.diagnoses.map((d) => ({
      id: d.id,
      code: d.code,
      nameAr: d.nameAr,
      nameEn: d.nameEn,
      dxType: d.dxType,
      isPrimary: d.isPrimary,
    })),
    vitals: encounter.vitals.map((v) => ({
      id: v.id,
      recordedAt: v.recordedAt.toISOString(),
      temperature: dec(v.temperature) !== undefined ? String(dec(v.temperature)) : undefined,
      pulse: v.pulse,
      respiratoryRate: v.respiratoryRate,
      systolic: v.systolic,
      diastolic: v.diastolic,
      o2sat: v.o2sat,
      weight: dec(v.weight) !== undefined ? String(dec(v.weight)) : undefined,
      height: dec(v.height) !== undefined ? String(dec(v.height)) : undefined,
      bmi: dec(v.bmi) !== undefined ? String(dec(v.bmi)) : undefined,
      bloodGlucose: dec(v.bloodGlucose) !== undefined ? String(dec(v.bloodGlucose)) : undefined,
      painScore: v.painScore,
      consciousness: v.consciousness,
      recordedBy: v.recordedBy
        ? { id: v.recordedBy.id, nameAr: v.recordedBy.nameAr, nameEn: v.recordedBy.nameEn }
        : null,
    })),
    prescriptions: encounter.prescriptions.map((p) => ({
      id: p.id,
      prescriptionNo: p.prescriptionNo,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      instructions: p.instructions,
      doctor: p.doctor
        ? { id: p.doctor.id, nameAr: p.doctor.nameAr, nameEn: p.doctor.nameEn }
        : null,
      items: p.items.map((it) => ({
        id: it.id,
        medicineNameAr: it.medicineNameAr,
        medicineNameEn: it.medicineNameEn,
        dosage: it.dosage,
        route: it.route,
        frequency: it.frequency,
        duration: it.duration,
        quantity: it.quantity,
        unit: it.unit,
        instructions: it.instructions,
      })),
    })),
    labOrders: encounter.labOrders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      clinicalNote: o.clinicalNote,
      items: o.items.map((it) => ({
        id: it.id,
        testId: it.testId,
        test: { id: it.test.id, code: it.test.code, nameAr: it.test.nameAr, nameEn: it.test.nameEn },
      })),
    })),
    radOrders: encounter.radOrders.map((r) => ({
      id: r.id,
      orderNo: r.orderNo,
      status: r.status,
      modality: r.modality,
      bodyPart: r.bodyPart,
      createdAt: r.createdAt.toISOString(),
    })),
  };

  const breadcrumbs: Crumb[] = [
    { label: t("encounters.list"), href: "/encounters" },
    { label: encounter.encounterNo },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={encounter.encounterNo}
        description={formatDateTime(encounter.createdAt, locale)}
        icon={<Stethoscope />}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <Badge variant={encounter.status === "COMPLETED" ? "success" : "default"}>
              {encounter.status === "COMPLETED" ? t("encounters.statusCompleted") : t("encounters.markInProgress")}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/patients/${encounter.patient.id}`}>{t("patients.profile")}</Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2.5">
            <Avatar className="size-10">
              <AvatarFallback>{patientName?.charAt(0) ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold">{patientName}</p>
              <p className="truncate text-xs text-muted-foreground tabular-nums">{encounter.patient.mrn}</p>
            </div>
          </div>
          <Info icon={<UserRound className="size-4" />} label={t("encounters.doctorLabel")} value={encounter.doctor ? (locale === "ar" ? encounter.doctor.nameAr : encounter.doctor.nameEn) : "—"} />
          <Info icon={<Hash className="size-4" />} label={t("appointments.list")} value={encounter.appointment?.appointmentNo ?? "—"} />
          <Info icon={<Phone className="size-4" />} label={t("common.phone")} value={encounter.patient.phone ?? "—"} />
        </CardContent>
      </Card>

      <EncounterWorkspace encounter={data} labTests={labTests.map((lt) => ({ id: lt.id, code: lt.code, nameAr: lt.nameAr, nameEn: lt.nameEn }))} locale={locale} />
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
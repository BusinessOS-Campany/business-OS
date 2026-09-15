import Link from "next/link";
import { cookies } from "next/headers";
import { BedDouble, HeartPulse, Activity, ClipboardList, Pill, Droplets } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getNursingStats, getNursingNotes, getMedAdministrations, getFluidItems, getAdmittedPatients } from "@/lib/services/nursing";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { NursingNoteForm } from "@/features/nursing/nursing-note-form";
import { NursingNotesTable, type NursingNoteRow } from "@/features/nursing/nursing-notes-table";
import { MarTable, type MarRow } from "@/features/nursing/mar-table";
import { FluidBoard, type FluidRow } from "@/features/nursing/fluid-board";

export const metadata = { title: "Nursing" };

export default async function NursingPage({
  searchParams,
}: {
  searchParams?: Promise<{ admission?: string }>;
}) {
  await requirePermission("nursing");
  const params = searchParams ? await searchParams : {};
  const admissionId = params.admission;

  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [{ admitted, icu, notesToday, medicationsToday, fluidToday, intake, output }, notes, marItems, fluidItems, admissions] =
    await Promise.all([
      getNursingStats(),
      getNursingNotes({ admissionId, limit: 60 }),
      getMedAdministrations({ admissionId, limit: 60 }),
      getFluidItems(admissionId),
      getAdmittedPatients(),
    ]);

  const admissionOptions = admissions.map((a) => ({
    id: a.id,
    admissionNo: a.admissionNo,
    isIcu: a.isIcu,
    patientNameAr: a.patient.nameAr,
    patientNameEn: a.patient.nameEn,
    mrn: a.patient.mrn,
  }));

  const noteRows: NursingNoteRow[] = notes.map((n) => ({
    id: n.id,
    admissionId: n.admissionId,
    admissionNo: n.admission?.admissionNo ?? null,
    patientNameAr: n.admission?.patient?.nameAr ?? null,
    patientNameEn: n.admission?.patient?.nameEn ?? null,
    mrn: n.admission?.patient?.mrn ?? null,
    category: n.category,
    note: n.note,
    authorNameAr: n.author?.nameAr ?? null,
    authorNameEn: n.author?.nameEn ?? null,
    createdAt: n.createdAt.toISOString(),
  }));

  const marRows: MarRow[] = marItems.map((m) => ({
    id: m.id,
    admissionId: m.admissionId,
    admissionNo: m.admission?.admissionNo ?? null,
    patientNameAr: m.admission?.patient?.nameAr ?? null,
    patientNameEn: m.admission?.patient?.nameEn ?? null,
    mrn: m.admission?.patient?.mrn ?? null,
    medicationName: m.medicationName,
    scheduledAt: m.scheduledAt.toISOString(),
    doseGiven: m.doseGiven,
    marStatus: m.marStatus,
    givenByNameAr: m.givenBy?.nameAr ?? null,
    givenByNameEn: m.givenBy?.nameEn ?? null,
    givenAt: m.givenAt?.toISOString() ?? null,
  }));

  const fluidRows: FluidRow[] = fluidItems.map((f) => ({
    id: f.id,
    admissionId: f.admissionId,
    admissionNo: f.admission?.admissionNo ?? null,
    patientNameAr: f.admission?.patient?.nameAr ?? null,
    patientNameEn: f.admission?.patient?.nameEn ?? null,
    type: f.type,
    category: f.category,
    amount: f.amount,
    recordedAt: f.recordedAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <PageHeader title={t("nursing.title")} description={t("nursing.title")} icon={<HeartPulse />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={BedDouble} label={t("nursing.activeAdmissions")} value={String(admitted)} variant="success" />
        <StatCard icon={Activity} label={t("nursing.icuPatients")} value={String(icu)} variant="danger" />
        <StatCard icon={ClipboardList} label={t("nursing.notesToday")} value={String(notesToday)} variant="info" />
        <StatCard icon={Pill} label={t("nursing.medicationsToday")} value={String(medicationsToday)} variant="primary" />
        <StatCard icon={Droplets} label={t("nursing.fluidToday")} value={String(fluidToday)} variant="warning" />
      </div>

      {admissionId && (
        <Link href="/nursing" className="text-xs text-muted-foreground hover:underline">
          ← {t("common.all")}
        </Link>
      )}

      <NursingNoteForm locale={locale} admissions={admissionOptions} defaultAdmissionId={admissionId} />

      <FluidBoard locale={locale} admissions={admissionOptions} defaultAdmissionId={admissionId} rows={fluidRows} intake={intake} output={output} />

      <MarTable rows={marRows} locale={locale} />
      <NursingNotesTable rows={noteRows} locale={locale} />
    </div>
  );
}
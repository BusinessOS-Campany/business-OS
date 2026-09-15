import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  UserRound,
  FileText,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Briefcase,
  Languages,
  HeartPulse,
  Stethoscope,
  CalendarClock,
  Receipt,
  BedDouble,
  Pill,
  FlaskConical,
  ScanLine,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getPatientById, getPatientTimeline } from "@/lib/services/patients";
import { formatDateTime, formatDate, formatNumber, initials } from "@/lib/utils";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientActions } from "@/features/patients/patient-actions";

export const metadata = { title: "Patient Profile" };

const BLOOD_KEY: Record<string, string> = {
  UNKNOWN: "bgUnknown",
  A_POS: "bgAPos",
  A_NEG: "bgANeg",
  B_POS: "bgBPos",
  B_NEG: "bgBNeg",
  AB_POS: "bgABPos",
  AB_NEG: "bgABNeg",
  O_POS: "bgOPos",
  O_NEG: "bgONeg",
};

const MARITAL_KEY: Record<string, string> = {
  UNKNOWN: "maritalUnknown",
  SINGLE: "maritalSingle",
  MARRIED: "maritalMarried",
  DIVORCED: "maritalDivorced",
  WIDOWED: "maritalWidowed",
};

const VISIT_KEY: Record<string, string> = {
  WALK_IN: "visitSourceWalkIn",
  SCHEDULED: "visitSourceScheduled",
  REFERRAL: "visitSourceReferral",
  EMERGENCY: "visitSourceUrgent",
  TRANSFER: "visitSourceTransfer",
  OTHER: "common.other",
};

const APPT_STATUS_KEY: Record<string, string> = {
  SCHEDULED: "statusScheduled",
  CONFIRMED: "statusConfirmed",
  ARRIVED: "statusArrived",
  WAITING: "statusWaiting",
  IN_CONSULTATION: "statusInConsultation",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
  NO_SHOW: "statusNoShow",
};

const STATUS_KEY: Record<string, string> = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DECEASED: "deceased",
};

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border bg-muted/20 px-3 py-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("patients");
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

  const [patient, timeline] = await Promise.all([
    getPatientById(id),
    getPatientTimeline(id),
  ]);

  if (!patient || patient.deletedAt) notFound();

  const primaryName = locale === "ar" ? patient.nameAr : patient.nameEn;
  const secondaryName = locale === "ar" ? patient.nameEn : patient.nameAr;
  const cityName = locale === "ar" ? patient.city?.nameAr : patient.city?.nameEn;
  const govName = locale === "ar" ? patient.governorate?.nameAr : patient.governorate?.nameEn;

  const breadcrumbs: Crumb[] = [
    { label: t("patients.list"), href: "/patients" },
    { label: primaryName || t("patients.medicalRecordNo") },
  ];

  const timelineItems = [
    ...timeline.appointments.map((a) => ({
      id: a.id,
      type: "appointment",
      title: t(`appointments.${APPT_STATUS_KEY[a.status] ?? "statusScheduled"}`),
      subtitle: a.doctor ? `${a.doctor.nameEn || a.doctor.nameAr || ""}${a.doctor.specialty ? ` · ${locale === "ar" ? a.doctor.specialty.nameAr : a.doctor.specialty.nameEn}` : ""}` : "",
      when: a.scheduledAt,
      href: `/appointments/${a.id}`,
    })),
    ...timeline.encounters.map((e) => ({
      id: e.id,
      type: "encounter",
      title: t("appointments.statusCompleted"),
      subtitle: e.doctor ? `${e.doctor.nameEn || e.doctor.nameAr || ""}${e.doctor.specialty ? ` · ${locale === "ar" ? e.doctor.specialty.nameAr : e.doctor.specialty.nameEn}` : ""}` : "",
      when: e.startedAt ?? e.createdAt,
      href: `/encounters/${e.id}`,
    })),
    ...timeline.invoices.map((inv) => ({
      id: inv.id,
      type: "invoice",
      title: inv.invoiceNo ?? t("billing.invoiceNo"),
      subtitle: `${formatNumber(Number(inv.total))} ${inv.currency}`,
      when: inv.issuedAt,
      href: `/billing/${inv.id}`,
    })),
    ...timeline.admissions.map((adm) => ({
      id: adm.id,
      type: "admission",
      title: t("dashboard.admittedPatients"),
      subtitle: `${adm.room ? (locale === "ar" ? adm.room.nameAr : adm.room.nameEn) : ""}${adm.bed ? ` · ${adm.bed.code}` : ""}`,
      when: adm.admittedAt,
      href: `/admissions/${adm.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, 30);

  const timelineIcon: Record<string, React.ReactNode> = {
    appointment: <CalendarClock className="size-4" />,
    encounter: <Stethoscope className="size-4" />,
    invoice: <Receipt className="size-4" />,
    admission: <BedDouble className="size-4" />,
  };

  const stats = [
    { icon: <FileText className="size-4" />, label: t("patients.visitHistory"), value: formatNumber(patient._count.encounters + patient._count.appointments) },
    { icon: <BedDouble className="size-4" />, label: t("dashboard.admittedPatients"), value: formatNumber(patient._count.admissions) },
    { icon: <Pill className="size-4" />, label: t("dashboard.rxToday"), value: formatNumber(patient._count.prescriptions) },
    { icon: <FlaskConical className="size-4" />, label: t("dashboard.labOrdersToday"), value: formatNumber(patient._count.labOrders) },
    { icon: <ScanLine className="size-4" />, label: t("dashboard.radOrdersToday"), value: formatNumber(patient._count.radOrders) },
    { icon: <Receipt className="size-4" />, label: t("billing.paid"), value: formatNumber(patient._count.invoices) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={primaryName || "—"}
        description={`${t("patients.medicalRecordNo")} · ${patient.mrn}`}
        icon={<UserRound />}
        breadcrumbs={breadcrumbs}
        actions={<PatientActions />}
      />

      {/* Print-only patient card */}
      <section className="hidden print:block rounded-lg border p-4">
        <h2 className="text-lg font-semibold">{primaryName}</h2>
        <p>{t("patients.medicalRecordNo")}: {patient.mrn}</p>
        <p>{t("patients.bloodGroup")}: {t(`patients.${BLOOD_KEY[patient.bloodGroup] ?? "bgUnknown"}`)}</p>
        <p>{patient.phone ?? t("patients.noPhone")}</p>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 print:hidden">
          <CardHeader className="pb-2 flex-row items-center justify-between gap-3 space-y-0">
            <div className="flex items-center gap-3">
              <Avatar className="size-14">
                <AvatarFallback className="text-lg">{initials(primaryName || "?")}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">{primaryName}</CardTitle>
                  <Badge variant="outline" className="tabular-nums">{patient.mrn}</Badge>
                  <Badge variant="secondary">{t(`patients.${STATUS_KEY[patient.patientStatus] ?? "active"}`)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{secondaryName}</p>
              </div>
            </div>
            <div className="hidden sm:block">
              <Badge variant="outline" className="tabular-nums">
                {t(`patients.${BLOOD_KEY[patient.bloodGroup] ?? "bgUnknown"}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {patient.gender && (
                <InfoItem
                  icon={<UserRound className="size-4" />}
                  label={t("common.gender")}
                  value={patient.gender === "MALE" ? t("common.male") : t("common.female")}
                />
              )}
              <InfoItem
                icon={<CalendarClock className="size-4" />}
                label={t("patients.age")}
                value={patient.age != null ? `${patient.age}` : formatDate(patient.dateOfBirth, locale)}
              />
              <InfoItem
                icon={<MapPin className="size-4" />}
                label={t("patients.city")}
                value={`${cityName ?? "—"}${govName ? `, ${govName}` : ""}`}
              />
              <InfoItem
                icon={<Phone className="size-4" />}
                label={t("patients.primaryPhone")}
                value={patient.phone || t("patients.noPhone")}
              />
              <InfoItem
                icon={<MessageCircle className="size-4" />}
                label={t("patients.whatsapp")}
                value={patient.whatsapp || t("patients.noPhone")}
              />
              <InfoItem
                icon={<Mail className="size-4" />}
                label={t("common.email")}
                value={patient.email}
              />
            </div>

            {/* Quick stats */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col items-center justify-center rounded-md border bg-muted/20 px-2 py-3 text-center">
                  <span className="text-muted-foreground">{s.icon}</span>
                  <span className="mt-1 text-lg font-semibold tabular-nums">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1 print:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("patients.insurance")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <InfoItem
              icon={<ShieldCheck className="size-4" />}
              label={t("patients.insurance")}
              value={locale === "ar" ? patient.insuranceCompany?.nameAr : patient.insuranceCompany?.nameEn}
            />
            <InfoItem
              icon={<FileText className="size-4" />}
              label={t("patients.medicalRecordNo")}
              value={patient.insurancePolicyNo}
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="print:hidden">
        <TabsList>
          <TabsTrigger value="overview">{t("patients.overview")}</TabsTrigger>
          <TabsTrigger value="timeline">{t("patients.timeline")}</TabsTrigger>
          <TabsTrigger value="clinical">{t("patients.clinical")}</TabsTrigger>
          <TabsTrigger value="documents">{t("patients.documents")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("patients.demographics")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoItem icon={<UserRound className="size-4" />} label={t("patients.nationalId")} value={patient.nationalId} />
                  <InfoItem icon={<FileText className="size-4" />} label={t("patients.passport")} value={patient.passportNo} />
                  <InfoItem icon={<Briefcase className="size-4" />} label={t("patients.occupation")} value={patient.occupation} />
                  <InfoItem icon={<HeartPulse className="size-4" />} label={t("patients.maritalStatus")} value={t(`patients.${MARITAL_KEY[patient.maritalStatus] ?? "maritalUnknown"}`)} />
                  <InfoItem icon={<Languages className="size-4" />} label={t("patients.preferredLanguage")} value={patient.preferredLanguage === "ar" ? t("patients.prefLanguageAr") : t("patients.prefLanguageEn")} />
                  <InfoItem icon={<UserRoundPlus className="size-4" />} label={t("patients.visitSource")} value={t(`patients.${VISIT_KEY[patient.visitSource] ?? "visitSourceWalkIn"}`)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("patients.emergencyContact")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <InfoItem icon={<UserRound className="size-4" />} label={t("patients.contactName")} value={patient.emergencyContactName} />
                <InfoItem icon={<Briefcase className="size-4" />} label={t("patients.relationship")} value={patient.emergencyContactRelation} />
                <InfoItem icon={<Phone className="size-4" />} label={t("patients.contactPhone")} value={patient.emergencyContactPhone} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-3">
          <Card>
            <CardContent className="p-5">
              {timelineItems.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {t("patients.noPatientsYet")}
                </p>
              ) : (
                <ol className="relative space-y-4 border-s ps-6">
                  {timelineItems.map((item) => (
                    <li key={item.type + item.id} className="relative">
                      <span className="absolute -start-7 flex size-6 items-center justify-center rounded-full border bg-card text-muted-foreground">
                        {timelineIcon[item.type]}
                      </span>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <Link href={item.href} className="text-sm font-medium hover:text-primary">
                            {item.title}
                          </Link>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                          )}
                        </div>
                        <time className="text-xs text-muted-foreground tabular-nums">
                          {formatDateTime(item.when, locale)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("patients.clinical")}</CardTitle>
              <CardDescription>{t("patients.details")}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col items-center justify-center rounded-md border bg-muted/20 px-2 py-4 text-center">
                  <span className="text-muted-foreground">{s.icon}</span>
                  <span className="mt-1 text-lg font-semibold tabular-nums">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("patients.documents")}</CardTitle>
              <CardDescription>{patient.documents.length} files</CardDescription>
            </CardHeader>
            <CardContent>
              {patient.documents.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {t("patients.noPatientsYet")}
                </p>
              ) : (
                <ul className="divide-y">
                  {patient.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5">
                        <FileText className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{d.title}</p>
                          <p className="text-xs text-muted-foreground">{d.fileName}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(d.createdAt, locale)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
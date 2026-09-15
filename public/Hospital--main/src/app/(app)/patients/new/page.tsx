import Link from "next/link";
import { cookies } from "next/headers";
import { UserRoundPlus } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getLocations } from "@/lib/services/patients";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "lucide-react";
import { PatientForm } from "@/features/patients/patient-form";

export const metadata = { title: "New Patient" };

export default async function NewPatientPage() {
  await requirePermission("patients", "create");
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

  const locations = await getLocations();

  const breadcrumbs: Crumb[] = [
    { label: t("patients.list"), href: "/patients" },
    { label: t("patients.registerNew") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("patients.createdTitle")}
        description={t("patients.createdHint")}
        icon={<UserRoundPlus />}
        breadcrumbs={breadcrumbs}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/patients">
              <ChevronLeftIcon className="size-4 rtl:rotate-180" />
              {t("patients.backToList")}
            </Link>
          </Button>
        }
      />
      <PatientForm locations={locations} locale={locale} />
    </div>
  );
}
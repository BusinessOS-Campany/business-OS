import { cookies } from "next/headers";
import { Users } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getDonors, getBloodUnits } from "@/lib/services/blood-bank";
import { getAppointmentPatients } from "@/lib/services/appointments";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DonorForm } from "@/features/blood-bank/donor-form";
import { DonationForm } from "@/features/blood-bank/donation-form";
import { DonorTable, type DonorRow } from "@/features/blood-bank/donor-table";

export const metadata = { title: "Blood Donors" };

export default async function BloodDonorsPage() {
  await requirePermission("bloodbank");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [donors, patients] = await Promise.all([getDonors(), getAppointmentPatients()]);

  const rows: DonorRow[] = donors.map((d) => ({
    id: d.id,
    nameAr: d.nameAr,
    nameEn: d.nameEn,
    phone: d.phone,
    gender: d.gender,
    bloodGroup: d.bloodGroup,
    donationCount: d.donations.length,
    lastDonation: d.donations.length ? d.donations[d.donations.length - 1].donationDate.toISOString() : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("bloodbank.donors")}
        description={t("bloodbank.title")}
        icon={<Users />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("bloodbank.donors")}</p>
              ) : (
                <DonorTable rows={rows} locale={locale} showDetails />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-5">
          <DonorForm />
          <div id="donate">
            <DonationForm
              locale={locale}
              donors={donors.map((d) => ({ id: d.id, nameAr: d.nameAr, nameEn: d.nameEn, bloodGroup: d.bloodGroup }))}
              patients={patients}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
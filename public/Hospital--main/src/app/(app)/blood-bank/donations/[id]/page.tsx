import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Droplets, ArrowLeft, User, CalendarHeart } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getDonationById } from "@/lib/services/blood-bank";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BloodUnitsTable, type BloodUnitRow } from "@/features/blood-bank/blood-units-table";

export const metadata = { title: "Donation" };

export default async function DonationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("bloodbank");
  const { id } = await params;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const donation = await getDonationById(id);
  if (!donation) notFound();

  const rows: BloodUnitRow[] = donation.unitsResult.map((u) => ({
    id: u.id,
    unitNo: u.unitNo,
    bloodGroup: u.bloodGroup,
    volume: u.volume,
    expiryDate: u.expiryDate ? u.expiryDate.toISOString() : null,
    tested: u.tested,
    status: u.status,
    donorName: null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("bloodbank.newDonation")}
        description={new Date(donation.donationDate).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB")}
        icon={<Droplets />}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/blood-bank/donors">
              <ArrowLeft className="size-4" /> {t("common.back")}
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4 text-primary" /> {t("bloodbank.donors")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{locale === "ar" ? donation.donor.nameAr : donation.donor.nameEn}</p>
            <p className="text-xs text-muted-foreground">{donation.donor.bloodGroup.replace("_", " ")}</p>
            {donation.donor.phone && <p className="text-xs text-muted-foreground">{donation.donor.phone}</p>}
            {donation.patient && (
              <>
                <p className="mt-3 text-xs text-muted-foreground">{t("common.patient")}</p>
                <p className="font-medium">{locale === "ar" ? donation.patient.nameAr : donation.patient.nameEn}</p>
                <p className="text-xs text-muted-foreground">{donation.patient.mrn}</p>
              </>
            )}
            <div className="space-y-1 border-t pt-3">
              <p className="text-xs text-muted-foreground">{t("bloodbank.units")}</p>
              <p className="font-medium">{donation.units}</p>
            </div>
            {donation.hemoglobin !== null && donation.hemoglobin !== undefined && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("bloodbank.hemoglobin")}</p>
                <p className="font-medium">{Number(donation.hemoglobin)} g/dL</p>
              </div>
            )}
            {donation.notes && <p className="pt-2 text-xs text-muted-foreground">{donation.notes}</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarHeart className="size-4 text-primary" />
              {t("bloodbank.units")} ({rows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("bloodbank.units")}</p>
            ) : (
              <BloodUnitsTable rows={rows} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import Link from "next/link";
import { cookies } from "next/headers";
import { Droplets, Users, CalendarHeart, Boxes, Lock, ShieldAlert, Timer } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getBloodBankStats, getAvailableUnitsByGroup, getBloodUnits } from "@/lib/services/blood-bank";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { BLOOD_GROUPS } from "@/lib/services/blood-bank";
import { BloodUnitsTable, type BloodUnitRow } from "@/features/blood-bank/blood-units-table";

export const metadata = { title: "Blood Bank" };

export default async function BloodBankPage() {
  await requirePermission("bloodbank");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [stats, groupCounts, units] = await Promise.all([getBloodBankStats(), getAvailableUnitsByGroup(), getBloodUnits()]);

  const byGroup = new Map(groupCounts.map((g) => [g.bloodGroup, g._count._all]));
  const allGroups = [...BLOOD_GROUPS, { value: "UNKNOWN" as const, key: "Unknown" }];
  const maxCount = Math.max(1, ...allGroups.map((g) => byGroup.get(g.value) ?? 0));

  const rows: BloodUnitRow[] = units.map((u) => ({
    id: u.id,
    unitNo: u.unitNo,
    bloodGroup: u.bloodGroup,
    volume: u.volume,
    expiryDate: u.expiryDate ? u.expiryDate.toISOString() : null,
    tested: u.tested,
    status: u.status,
    donorName: u.donation.donor ? (locale === "ar" ? u.donation.donor.nameAr : u.donation.donor.nameEn) : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("bloodbank.title")}
        description={t("bloodbank.units")}
        icon={<Droplets />}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/blood-bank/donors">
                <Users className="size-4" /> {t("bloodbank.donors")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/blood-bank/donors#donate">
                <CalendarHeart className="size-4" /> {t("bloodbank.newDonation")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard icon={Droplets} label={t("bloodbank.available")} value={String(stats.available)} variant="success" />
        <StatCard icon={ShieldAlert} label={t("bloodbank.quarantined")} value={String(stats.quarantined)} variant="warning" />
        <StatCard icon={Lock} label={t("bloodbank.reserved")} value={String(stats.reserved)} variant="info" />
        <StatCard icon={Boxes} label={t("bloodbank.issued")} value={String(stats.issued)} variant="default" />
        <StatCard icon={Timer} label={t("bloodbank.expiringSoon")} value={String(stats.expiringSoon)} variant="danger" />
        <StatCard icon={Users} label={t("bloodbank.donorCount")} value={String(stats.donorCount)} variant="primary" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("bloodbank.bloodGroup")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allGroups.map((g) => (
              <div key={g.value} className="flex items-center gap-3">
                <span className="w-16 text-sm font-medium">{g.key}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${((byGroup.get(g.value) ?? 0) / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm tabular-nums">{byGroup.get(g.value) ?? 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="size-4 text-primary" />
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
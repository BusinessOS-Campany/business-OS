import Link from "next/link";
import { cookies } from "next/headers";
import { Ambulance, Truck, Plus, Send, CheckCircle2, Wrench } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getAmbulances, getTrips, getAmbulanceStats } from "@/lib/services/ambulance";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { AmbulanceTable, type AmbulanceRow } from "@/features/ambulance/ambulance-table";
import { TripTable, type TripRow } from "@/features/ambulance/trip-table";

export const metadata = { title: "Ambulance" };

export default async function AmbulancePage() {
  await requirePermission("ambulance");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [vehicles, trips, stats] = await Promise.all([getAmbulances(), getTrips({ limit: 20 }), getAmbulanceStats()]);

  const vehicleRows: AmbulanceRow[] = vehicles.map((a) => ({
    id: a.id,
    code: a.code,
    plateNo: a.plateNo,
    model: a.model,
    capacity: a.capacity,
    status: a.status,
  }));

  const tripRows: TripRow[] = trips.map((tr) => ({
    id: tr.id,
    tripNo: tr.tripNo,
    ambulanceCode: tr.ambulance.code,
    driverNameAr: tr.driver?.nameAr ?? null,
    driverNameEn: tr.driver?.nameEn ?? null,
    patientName: tr.patient ? (locale === "ar" ? tr.patient.nameAr : tr.patient.nameEn) : tr.patientName,
    pickup: tr.pickupLocation,
    destination: tr.destination,
    status: tr.status,
    dispatchedAt: tr.dispatchedAt ? tr.dispatchedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("ambulance.title")}
        description={t("ambulance.dispatch")}
        icon={<Ambulance />}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/ambulance/trips">
                <Send className="size-4" /> {t("dispatchTrip")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/ambulance/fleet">
                <Plus className="size-4" /> {t("newVehicle")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Truck} label={t("ambulance.statusAvailable")} value={String(stats.available)} variant="success" />
        <StatCard icon={Send} label={t("ambulance.dispatch")} value={String(stats.activeTrips)} variant="warning" />
        <StatCard icon={Truck} label={t("ambulance.statusTransporting")} value={String(stats.transporting)} variant="info" />
        <StatCard icon={CheckCircle2} label={t("ambulance.completedToday")} value={String(stats.completedToday)} variant="success" />
        <StatCard icon={Wrench} label={t("ambulance.statusMaintenance")} value={String(stats.maintenance)} variant="primary" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="size-4 text-primary" />
              {t("ambulance.fleet")} ({vehicleRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicleRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("ambulance.newVehicle")}</p>
            ) : (
              <AmbulanceTable rows={vehicleRows} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="size-4 text-primary" />
              {t("ambulance.activeTrips")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tripRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("ambulance.trips")}</p>
            ) : (
              <TripTable rows={tripRows} locale={locale} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";
import { Send } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getTrips, getAmbulances, getDrivers } from "@/lib/services/ambulance";
import { getAppointmentPatients } from "@/lib/services/appointments";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TripStatus } from "@prisma/client";
import { DispatchForm } from "@/features/ambulance/dispatch-form";
import { TripTable, type TripRow } from "@/features/ambulance/trip-table";

export const metadata = { title: "Ambulance Trips" };

const FILTERS: Array<{ value: string; labelKey: string }> = [
  { value: "", labelKey: "common.all" },
  { value: "DISPATCHED", labelKey: "ambulance.tripDispatched" },
  { value: "EN_ROUTE", labelKey: "ambulance.tripEnRoute" },
  { value: "ARRIVED", labelKey: "ambulance.tripArrived" },
  { value: "TRANSPORTING", labelKey: "ambulance.tripTransporting" },
  { value: "COMPLETED", labelKey: "ambulance.tripCompleted" },
  { value: "CANCELLED", labelKey: "ambulance.tripCancelled" },
];

export default async function AmbulanceTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("ambulance");
  const { status } = await searchParams;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const statusValue = FILTERS.some((f) => f.value === status) ? (status as TripStatus | undefined) : undefined;
  const [trips, ambulances, drivers, patients] = await Promise.all([
    getTrips({ status: statusValue }),
    getAmbulances({ status: "AVAILABLE" }),
    getDrivers(),
    getAppointmentPatients(),
  ]);

  const rows: TripRow[] = trips.map((tr) => ({
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
        title={t("ambulance.trips")}
        description={t("ambulance.dispatch")}
        icon={<Send />}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/ambulance/fleet">{t("ambulance.fleet")}</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f.value || "all"}
            asChild
            size="sm"
            variant={statusValue === f.value || (!statusValue && f.value === "") ? "default" : "outline"}
            className={cn("h-7 px-2.5 text-xs")}
          >
            <Link href={f.value ? `?status=${f.value}` : "/ambulance/trips"}>{t(f.labelKey)}</Link>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TripTable rows={rows} locale={locale} />
        </div>
        <DispatchForm
          locale={locale}
          ambulances={ambulances.map((a) => ({ id: a.id, code: a.code }))}
          drivers={drivers}
          patients={patients}
        />
      </div>
    </div>
  );
}

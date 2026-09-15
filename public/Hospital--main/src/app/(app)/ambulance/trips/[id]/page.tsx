import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Ambulance, ArrowLeft, MapPin, User, Truck, AlarmClock, CheckCircle2, XCircle, Siren } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getTripById } from "@/lib/services/ambulance";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TripStatusActions } from "@/features/ambulance/trip-status-actions";

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "muted" | "destructive"> = {
  DISPATCHED: "warning",
  EN_ROUTE: "info",
  ARRIVED: "info",
  TRANSPORTING: "info",
  COMPLETED: "success",
  CANCELLED: "muted",
};

const STATUS_LABEL: Record<string, string> = {
  DISPATCHED: "ambulance.tripDispatched",
  EN_ROUTE: "ambulance.tripEnRoute",
  ARRIVED: "ambulance.tripArrived",
  TRANSPORTING: "ambulance.tripTransporting",
  COMPLETED: "ambulance.tripCompleted",
  CANCELLED: "ambulance.tripCancelled",
};

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("ambulance");
  const { id } = await params;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const trip = await getTripById(id);
  if (!trip) notFound();

  const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB") : "—");

  const timeline: Array<{ icon: typeof MapPin; label: string; time: Date | null }> = [
    { icon: AlarmClock, label: t("ambulance.tripDispatched"), time: trip.dispatchedAt },
    { icon: MapPin, label: t("ambulance.tripArrived"), time: trip.arrivedAt },
    { icon: Siren, label: t("ambulance.tripTransporting"), time: trip.transportingAt },
    { icon: CheckCircle2, label: t("ambulance.tripCompleted"), time: trip.completedAt },
    { icon: XCircle, label: t("ambulance.tripCancelled"), time: trip.cancelledAt },
  ].filter((e) => e.time);

  return (
    <div className="space-y-5">
      <PageHeader
        title={trip.tripNo}
        description={trip.pickupLocation}
        icon={<Ambulance />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[trip.status] ?? "outline"}>{t(STATUS_LABEL[trip.status] ?? trip.status)}</Badge>
            {(trip.status !== "COMPLETED" && trip.status !== "CANCELLED") && <TripStatusActions tripId={trip.id} status={trip.status} />}
            <Button asChild variant="outline" size="sm">
              <Link href="/ambulance/trips">
                <ArrowLeft className="size-4" /> {t("common.back")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("ambulance.tripInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("ambulance.pickup")}</p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <MapPin className="size-4 text-primary" /> {trip.pickupLocation}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("ambulance.destination")}</p>
                  <p className="font-medium">{trip.destination ?? "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("ambulance.priority")}</p>
                  <p className="font-medium">{trip.priority}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("ambulance.note")}</p>
                  <p className="font-medium">{trip.note ?? "—"}</p>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                {timeline.map((e) => (
                  <div key={e.label} className="flex items-center gap-2 text-sm">
                    <e.icon className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{e.label}:</span>
                    <span className="font-medium">{fmt(e.time)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-4 text-primary" /> {t("ambulance.ambulanceInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{trip.ambulance.code}</p>
              <p className="text-muted-foreground">{trip.ambulance.plateNo}{trip.ambulance.model ? " · " + trip.ambulance.model : ""}</p>
              {trip.driver && (
                <>
                  <p className="mt-3 text-xs text-muted-foreground">{t("ambulance.driver")}</p>
                  <p className="font-medium">{locale === "ar" ? trip.driver.nameAr : trip.driver.nameEn}</p>
                  {trip.driver.phone && <p className="text-xs text-muted-foreground">{trip.driver.phone}</p>}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4 text-primary" /> {t("common.patient")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {trip.patient ? (
                <>
                  <p className="font-medium">{locale === "ar" ? trip.patient.nameAr : trip.patient.nameEn}</p>
                  <p className="text-muted-foreground">
                    {trip.patient.mrn}
                    {trip.patient.phone ? " · " + trip.patient.phone : ""}
                  </p>
                </>
              ) : (
                <p className="font-medium">{trip.patientName ?? "—"}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
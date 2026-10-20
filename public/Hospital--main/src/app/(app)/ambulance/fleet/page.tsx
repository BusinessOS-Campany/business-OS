import { cookies } from "next/headers";
import { Truck } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getAmbulances } from "@/lib/services/ambulance";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AmbulanceForm } from "@/features/ambulance/ambulance-form";
import { AmbulanceTable, type AmbulanceRow } from "@/features/ambulance/ambulance-table";

export const metadata = { title: "Ambulance Fleet" };

export default async function AmbulanceFleetPage() {
  await requirePermission("ambulance");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const vehicles = await getAmbulances();
  const rows: AmbulanceRow[] = vehicles.map((a) => ({
    id: a.id,
    code: a.code,
    plateNo: a.plateNo,
    model: a.model,
    capacity: a.capacity,
    status: a.status,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("ambulance.fleet")}
        description={t("ambulance.vehicles")}
        icon={<Truck />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("ambulance.vehicles")}</p>
              ) : (
                <AmbulanceTable rows={rows} />
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <AmbulanceForm />
        </div>
      </div>
    </div>
  );
}

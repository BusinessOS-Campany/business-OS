import Link from "next/link";
import { cookies } from "next/headers";
import {
  Pill,
  ClipboardList,
  Boxes,
  AlertTriangle,
  CalendarClock,
  PackagePlus,
} from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import {
  getPendingPrescriptions,
  getPharmacyStats,
  getInventoryItems,
} from "@/lib/services/pharmacy";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { PrescriptionsTable } from "@/features/pharmacy/prescriptions-table";
import { MedicinesTable } from "@/features/pharmacy/medicines-table";

export const metadata = { title: "Pharmacy" };

export default async function PharmacyPage() {
  await requirePermission("pharmacy");
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

  const [pending, stats, lowStock] = await Promise.all([
    getPendingPrescriptions(),
    getPharmacyStats(),
    getInventoryItems({ lowStock: true }),
  ]);

  const recRows = pending.map((p) => ({
    id: p.id,
    prescriptionNo: p.prescriptionNo,
    patientNameAr: p.patient.nameAr,
    patientNameEn: p.patient.nameEn,
    mrn: p.patient.mrn,
    doctorNameAr: p.doctor?.nameAr ?? null,
    doctorNameEn: p.doctor?.nameEn ?? null,
    departmentNameAr: p.encounter?.department?.nameAr ?? null,
    departmentNameEn: p.encounter?.department?.nameEn ?? null,
    createdAt: p.createdAt.toISOString(),
    itemCount: p.items.length,
    dispensedCount: p.items.filter((i) => i.isDispensed).length,
  }));

  const lowRows = lowStock.map((it) => ({
    id: it.id,
    code: it.code,
    nameAr: it.nameAr,
    nameEn: it.nameEn,
    category: it.category,
    unit: it.unit,
    strength: it.strength ?? "",
    totalStock: it.totalStock,
    reorderLevel: it.reorderLevel,
    isLowStock: true,
    expiringSoonCount: it.expiringSoonCount,
    nearestExpiry: it.nearestExpiry?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("pharmacy.title")}
        description={t("pharmacy.dispense")}
        icon={<Pill />}
        actions={
          <Button asChild size="sm">
            <Link href="/pharmacy/prescriptions">
              <ClipboardList className="size-3.5" />
              {t("pharmacy.prescriptions")}
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label={t("pharmacy.pendingDispense")} value={String(stats.pendingCount)} variant="info" />
        <StatCard icon={AlertTriangle} label={t("pharmacy.lowStock")} value={String(stats.lowStockCount)} variant="warning" />
        <StatCard icon={Boxes} label={t("pharmacy.inventoryItems")} value={String(stats.totalItems)} />
        <StatCard icon={CalendarClock} label={t("pharmacy.movements30d")} value={String(stats.recentMovements)} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" />
              {t("pharmacy.pendingDispense")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("pharmacy.dispensed")}</p>
            ) : (
              <div className="max-h-80 overflow-auto">
                <PrescriptionsTable rows={recRows} locale={locale} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" />
              {t("pharmacy.lowStock")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("pharmacy.noMedicines")}</p>
            ) : (
              <ul className="divide-y">
                {lowStock.map((it) => (
                  <li key={it.id} className="space-y-1 py-2.5">
                    <Link href={`/pharmacy/medicines/${it.id}`} className="flex items-center justify-between gap-2 hover:underline">
                      <span className="truncate font-medium">
                        {locale === "ar" ? it.nameAr : it.nameEn}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground text-sm">
                        {it.totalStock} / {it.reorderLevel}
                      </span>
                    </Link>
                    {it.expiringSoonCount > 0 && (
                      <Badge variant="warning" className="gap-1">
                        <CalendarClock className="size-3" />
                        {t("pharmacy.expiringSoon")} · {it.expiringSoonCount}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/inventory" className="gap-1.5">
                  <PackagePlus className="size-3.5" />
                  {t("pharmacy.adjustStock")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
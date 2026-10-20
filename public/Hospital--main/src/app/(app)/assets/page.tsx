import { cookies } from "next/headers";
import { Boxes, CheckCircle2, Wrench, Archive, XCircle } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getAssets, getAssetStats, getAssetOptions } from "@/lib/services/assets";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { AssetsTable, type AssetRow } from "@/features/assets/assets-table";
import { AssetForm } from "@/features/assets/asset-form";

export const metadata = { title: "Assets" };

export default async function AssetsPage() {
  await requirePermission("assets");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [assets, stats, options] = await Promise.all([getAssets({ limit: 50 }), getAssetStats(), getAssetOptions()]);

  const rows: AssetRow[] = assets.map((a) => ({
    id: a.id,
    assetNo: a.assetNo,
    nameAr: a.nameAr,
    nameEn: a.nameEn ?? "",
    category: a.category,
    location: a.location,
    serialNo: a.serialNo,
    departmentNameAr: a.department?.nameAr ?? null,
    departmentNameEn: a.department?.nameEn ?? null,
    custodianNameAr: a.custodian?.nameAr ?? null,
    custodianNameEn: a.custodian?.nameEn ?? null,
    cost: a.cost != null ? Number(a.cost) : null,
    status: a.status,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("assets.title")}
        description={t("assets.title")}
        icon={<Boxes />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Boxes} label={t("common.total")} value={String(stats.total)} variant="default" />
        <StatCard icon={CheckCircle2} label={t("assets.statusActive")} value={String(stats.active)} variant="success" />
        <StatCard icon={Wrench} label={t("assets.statusUnderMaintenance")} value={String(stats.underMaintenance)} variant="warning" />
        <StatCard icon={Archive} label={t("assets.statusRetired")} value={String(stats.retired)} variant="info" />
        <StatCard icon={XCircle} label={t("assets.statusLost")} value={String(stats.lost)} variant="danger" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AssetForm locale={locale} departments={options.departments} employees={options.employees} />
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Boxes className="size-4 text-primary" />
                {t("assets.title")} ({rows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("assets.noAssets")}</p>
              ) : (
                <AssetsTable rows={rows} locale={locale} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
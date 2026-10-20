import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Boxes, ArrowLeft, MapPin, Tag, CalendarDays, Wrench, User, Coins } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getAssetById } from "@/lib/services/assets";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "muted" | "destructive"> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  UNDER_MAINTENANCE: "warning",
  RETIRED: "muted",
  LOST: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "assets.statusActive",
  INACTIVE: "assets.statusInactive",
  UNDER_MAINTENANCE: "assets.statusUnderMaintenance",
  RETIRED: "assets.statusRetired",
  LOST: "assets.statusLost",
};

const MAINT_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "maintenance.statusRequested",
  SCHEDULED: "maintenance.statusScheduled",
  IN_PROGRESS: "maintenance.statusInProgress",
  COMPLETED: "maintenance.statusCompleted",
  CANCELLED: "maintenance.statusCancelled",
};

const MAINT_STATUS_VARIANT: Record<string, "warning" | "info" | "destructive" | "success" | "muted"> = {
  REQUESTED: "warning",
  SCHEDULED: "info",
  IN_PROGRESS: "destructive",
  COMPLETED: "success",
  CANCELLED: "muted",
};

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("assets");
  const { id } = await params;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const asset = await getAssetById(id);
  if (!asset) notFound();

  const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB") : "—");
  const money = asset.cost !== null && asset.cost !== undefined ? Number(asset.cost).toLocaleString(locale === "ar" ? "ar-EG" : "en-US") : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={asset.assetNo}
        description={`${asset.nameAr}${asset.nameEn ? " · " + asset.nameEn : ""}`}
        icon={<Boxes />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[asset.status] ?? "outline"}>{t(STATUS_LABEL[asset.status] ?? asset.status)}</Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/assets">
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
              <CardTitle className="text-base">{t("assets.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("assets.category")}</p>
                  <p className="font-medium">{asset.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("assets.serialNo")}</p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Tag className="size-4 text-primary" />
                    {asset.serialNo ?? "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("assets.cost")}</p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Coins className="size-4 text-primary" />
                    {money != null ? money : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("assets.location")}</p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <MapPin className="size-4 text-primary" />
                    {asset.location ?? "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("admissions.department")}</p>
                  <p className="font-medium">
                    {asset.department ? (locale === "ar" ? asset.department.nameAr : asset.department.nameEn) : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("assets.custodian")}</p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <User className="size-4 text-primary" />
                    {asset.custodian ? (locale === "ar" ? asset.custodian.nameAr : asset.custodian.nameEn) : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("common.date")}</p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <CalendarDays className="size-4 text-primary" />
                    {fmt(asset.purchaseDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("assets.warranty")}</p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <CalendarDays className="size-4 text-primary" />
                    {fmt(asset.warrantyUntil)}
                  </p>
                </div>
              </div>
              {asset.note && (
                <div className="rounded-md border-t pt-3">
                  <p className="text-xs text-muted-foreground">{t("common.notes")}</p>
                  <p className="whitespace-pre-wrap pt-1 text-muted-foreground">{asset.note}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="size-4 text-primary" />
                {t("maintenance.requests")} ({asset.maintenanceRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {asset.maintenanceRequests.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("maintenance.noRequests")}</p>
              ) : (
                asset.maintenanceRequests.map((r) => (
                  <Link
                    key={r.id}
                    href={`/maintenance/${r.id}`}
                    className="block rounded-lg border p-3 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-medium">{r.requestNo}</span>
                      <Badge variant={MAINT_STATUS_VARIANT[r.status] ?? "outline"}>
                        {t(MAINT_STATUS_LABEL[r.status] ?? r.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.scheduledAt ? fmt(r.scheduledAt) : "—"}
                      {r.technician ? " · " + (locale === "ar" ? r.technician.nameAr : r.technician.nameEn) : ""}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Wrench, ArrowLeft, Boxes, CalendarClock, User, Coins, ClipboardList } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getMaintenanceRequestById } from "@/lib/services/maintenance";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaintenanceStatusActions } from "@/features/maintenance/maintenance-status-actions";
import { MaintenanceCompleteForm } from "@/features/maintenance/maintenance-complete-form";

const STATUS_VARIANT: Record<string, "warning" | "info" | "destructive" | "success" | "muted"> = {
  REQUESTED: "warning",
  SCHEDULED: "info",
  IN_PROGRESS: "destructive",
  COMPLETED: "success",
  CANCELLED: "muted",
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "maintenance.statusRequested",
  SCHEDULED: "maintenance.statusScheduled",
  IN_PROGRESS: "maintenance.statusInProgress",
  COMPLETED: "maintenance.statusCompleted",
  CANCELLED: "maintenance.statusCancelled",
};

const TYPE_LABEL: Record<string, string> = {
  PREVENTIVE: "maintenance.typePreventive",
  CORRECTIVE: "maintenance.typeCorrective",
};

export default async function MaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("maintenance");
  const { id } = await params;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const request = await getMaintenanceRequestById(id);
  if (!request) notFound();

  const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB") : "—");
  const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB") : "—");
  const money = request.cost !== null && request.cost !== undefined ? Number(request.cost).toLocaleString(locale === "ar" ? "ar-EG" : "en-US") : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={request.requestNo}
        description={`${t("assets.title")}: ${request.asset.assetNo} — ${locale === "ar" ? request.asset.nameAr : request.asset.nameEn}`}
        icon={<Wrench />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[request.status] ?? "outline"}>{t(STATUS_LABEL[request.status] ?? request.status)}</Badge>
            {request.status !== "COMPLETED" && request.status !== "CANCELLED" && (
              <MaintenanceStatusActions requestId={request.id} status={request.status} />
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/maintenance">
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
              <CardTitle className="flex items-center gap-2 text-base">
                <Boxes className="size-4 text-primary" />
                {t("assets.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Link href={`/assets/${request.asset.id}`} className="font-medium text-primary hover:underline">
                {request.asset.assetNo} — {locale === "ar" ? request.asset.nameAr : request.asset.nameEn}
              </Link>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>
                  {t("assets.category")}: {request.asset.category}
                </span>
                <span>
                  {t("assets.serialNo")}: {request.asset.serialNo ?? "—"}
                </span>
                <span>
                  {t("assets.location")}: {request.asset.location ?? "—"}
                </span>
                <span>
                  {t("common.status")}: {t(STATUS_LABEL_LOOKUP[request.asset.status] ?? request.asset.status)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">{t("common.description")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{request.description}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="size-4 text-primary" />
                {t("maintenance.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("appointments.type")}</span>
                <span className="font-medium">{t(TYPE_LABEL[request.type] ?? request.type)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("employees.title")}</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <User className="size-4 text-primary" />
                  {request.technician ? (locale === "ar" ? request.technician.nameAr : request.technician.nameEn) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">{t("surgery.scheduledAt")}</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <CalendarClock className="size-4 text-primary" />
                  {fmt(request.scheduledAt)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">{t("maintenance.statusCompleted")}</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <CalendarClock className="size-4 text-primary" />
                  {fmtDate(request.completedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">{t("maintenance.cost")}</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Coins className="size-4 text-primary" />
                  {money != null ? money : "—"}
                </span>
              </div>
              {request.spareParts && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground">{t("maintenance.spareParts")}</p>
                  <p className="whitespace-pre-wrap pt-1 text-muted-foreground">{request.spareParts}</p>
                </div>
              )}
              {request.note && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground">{t("common.notes")}</p>
                  <p className="whitespace-pre-wrap pt-1 text-muted-foreground">{request.note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {request.status === "IN_PROGRESS" && <MaintenanceCompleteForm requestId={request.id} />}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL_LOOKUP: Record<string, string> = {
  ACTIVE: "assets.statusActive",
  INACTIVE: "assets.statusInactive",
  UNDER_MAINTENANCE: "assets.statusUnderMaintenance",
  RETIRED: "assets.statusRetired",
  LOST: "assets.statusLost",
};
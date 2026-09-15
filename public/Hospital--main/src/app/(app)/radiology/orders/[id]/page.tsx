import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Printer } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getRadOrderById } from "@/lib/services/radiology";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadOrderStatusActions } from "@/features/rad/rad-order-status-actions";
import { RadReportForm } from "@/features/rad/rad-report-form";

export const metadata = { title: "Radiology Order Detail" };

const STATUS_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "destructive"> = {
  ORDERED: "info", SCHEDULED: "secondary", PERFORMED: "warning", REPORTED: "success", REVIEWED: "default", CANCELLED: "destructive",
};

const MODALITY_LABEL: Record<string, string> = {
  XRAY: "radiology.modalityXRAY",
  CT: "radiology.modalityCT",
  MRI: "radiology.modalityMRI",
  ULTRASOUND: "radiology.modalityULTRASOUND",
  MAMMOGRAPHY: "radiology.modalityMAMMOGRAPHY",
  FLUOROSCOPY: "radiology.modalityFLUOROSCOPY",
  PET: "radiology.modalityPET",
  OTHER: "radiology.modalityOTHER",
};

export default async function RadOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("radiology");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const order = await getRadOrderById(id);
  if (!order) notFound();

  const patient = locale === "ar" ? order.patient.nameAr : order.patient.nameEn;
  const doctor = locale === "ar" ? order.doctor?.nameAr : order.doctor?.nameEn;
  const dept = locale === "ar" ? order.encounter?.department?.nameAr : order.encounter?.department?.nameEn;

  const statusLabel: Record<string, string> = {
    ORDERED: t("radiology.statusOrdered"),
    SCHEDULED: t("radiology.statusScheduled"),
    PERFORMED: t("radiology.statusPerformed"),
    REPORTED: t("radiology.statusReported"),
    REVIEWED: t("radiology.statusReviewed"),
    CANCELLED: t("radiology.statusCancelled"),
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={order.orderNo}
        description={patient}
        icon={<Link href="/radiology/orders" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="size-3.5" />
              {t("common.print")}
            </Button>
            <RadOrderStatusActions orderId={order.id} status={order.status} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">{t("common.patient")}</p>
            <p className="font-medium">{patient}</p>
            <p className="text-xs text-muted-foreground">{order.patient.mrn}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">{t("common.doctor")}</p>
            <p className="font-medium">{doctor ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{dept ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">{t("radiology.modality")}</p>
            <p className="font-medium">{t(MODALITY_LABEL[order.modality] ?? order.modality)}</p>
            <p className="text-xs text-muted-foreground">{t("radiology.bodyPart")}: {order.bodyPart ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <p className="text-xs text-muted-foreground">{t("common.status")}</p>
            <p><Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>{statusLabel[order.status] ?? order.status}</Badge></p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {order.clinicalNote && <span>{t("radiology.clinicalNote")}: {order.clinicalNote}</span>}
        {order.scheduledAt && <span>{t("radiology.schedule")}: {new Date(order.scheduledAt).toLocaleString()}</span>}
        {order.performedAt && <span>{t("radiology.performed")}: {new Date(order.performedAt).toLocaleString()}</span>}
      </div>

      <RadReportForm
        orderId={order.id}
        status={order.status}
        locale={locale}
        report={
          order.report
            ? {
                id: order.report.id,
                findings: order.report.findings,
                impression: order.report.impression,
                attachments: order.report.attachments,
                reportedByName: (locale === "ar" ? order.report.reportedBy?.nameAr : order.report.reportedBy?.nameEn) ?? null,
                reviewedByName: (locale === "ar" ? order.report.reviewedBy?.nameAr : order.report.reviewedBy?.nameEn) ?? null,
                reportedAt: order.report.reportedAt.toISOString(),
                reviewedAt: order.report.reviewedAt?.toISOString() ?? null,
              }
            : null
        }
      />
    </div>
  );
}
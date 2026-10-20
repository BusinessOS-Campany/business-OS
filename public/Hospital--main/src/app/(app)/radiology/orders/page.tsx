import Link from "next/link";
import { cookies } from "next/headers";
import { ScanLine } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getRadOrders } from "@/lib/services/radiology";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RadOrderStatus } from "@prisma/client";
import { RadOrdersTable, type RadOrderRow } from "@/features/rad/rad-orders-table";

export const metadata = { title: "Radiology Orders" };

const FILTERS: Array<{ value: string; labelKey: string }> = [
  { value: "", labelKey: "common.all" },
  { value: "ORDERED", labelKey: "radiology.statusOrdered" },
  { value: "SCHEDULED", labelKey: "radiology.statusScheduled" },
  { value: "PERFORMED", labelKey: "radiology.statusPerformed" },
  { value: "REPORTED", labelKey: "radiology.statusReported" },
  { value: "REVIEWED", labelKey: "radiology.statusReviewed" },
];

export default async function RadOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermission("radiology");
  const { status } = await searchParams;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const statusValue = FILTERS.some((f) => f.value === status) ? (status as RadOrderStatus | undefined) : undefined;
  const orders = await getRadOrders({ status: statusValue });

  const rows: RadOrderRow[] = orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    patientNameAr: o.patient.nameAr,
    patientNameEn: o.patient.nameEn,
    mrn: o.patient.mrn,
    doctorNameAr: o.doctor?.nameAr ?? null,
    doctorNameEn: o.doctor?.nameEn ?? null,
    modality: o.modality,
    bodyPart: o.bodyPart,
    status: o.status,
    hasReport: !!o.report,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <PageHeader title={t("radiology.orders")} description={t("radiology.title")} icon={<ScanLine />} />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f.value || "all"}
            asChild
            size="sm"
            variant={statusValue === f.value || (!statusValue && f.value === "") ? "default" : "outline"}
            className={cn("h-7 px-2.5 text-xs")}
          >
            <Link href={f.value ? `?status=${f.value}` : "/radiology/orders"}>{t(f.labelKey)}</Link>
          </Button>
        ))}
      </div>

      <RadOrdersTable rows={rows} locale={locale} />
    </div>
  );
}
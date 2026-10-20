import Link from "next/link";
import { cookies } from "next/headers";
import { ListChecks } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getLabOrders } from "@/lib/services/laboratory";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LabOrderStatus } from "@prisma/client";
import { LabOrdersTable, type LabOrderRow } from "@/features/lab/lab-orders-table";

export const metadata = { title: "Lab Orders" };

const FILTERS: Array<{ value: string; labelKey: string }> = [
  { value: "", labelKey: "common.all" },
  { value: "ORDERED", labelKey: "laboratory.statusOrdered" },
  { value: "COLLECTED", labelKey: "laboratory.statusCollected" },
  { value: "RECEIVED", labelKey: "laboratory.statusReceived" },
  { value: "PROCESSING", labelKey: "laboratory.statusProcessing" },
  { value: "COMPLETED", labelKey: "laboratory.statusCompleted" },
  { value: "REVIEWED", labelKey: "laboratory.statusReviewed" },
  { value: "CANCELLED", labelKey: "laboratory.statusCancelled" },
];

export default async function LabOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("laboratory");
  const { status } = await searchParams;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const statusValue = FILTERS.some((f) => f.value === status) ? (status as LabOrderStatus | undefined) : undefined;
  const orders = await getLabOrders({ status: statusValue });

  const rows: LabOrderRow[] = orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    patientNameAr: o.patient.nameAr,
    patientNameEn: o.patient.nameEn,
    mrn: o.patient.mrn,
    doctorNameAr: o.doctor?.nameAr ?? null,
    doctorNameEn: o.doctor?.nameEn ?? null,
    priority: o.priority,
    status: o.status,
    itemCount: o.items.length,
    resultCount: o.items.filter((i) => i.results.length > 0).length,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("laboratory.orders")}
        description={t("laboratory.title")}
        icon={<ListChecks />}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/laboratory/catalog">{t("laboratory.viewCatalog")}</Link>
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
            <Link href={f.value ? `?status=${f.value}` : "/laboratory/orders"}>{t(f.labelKey)}</Link>
          </Button>
        ))}
      </div>

      <LabOrdersTable rows={rows} locale={locale} />
    </div>
  );
}
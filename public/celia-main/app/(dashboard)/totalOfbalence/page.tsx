import { requirePagePermission } from "@/lib/session";
import { getBalanceCharges } from "@/lib/balance/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { BalanceTotalsView } from "@/components/balance/balance-totals-view";

export const metadata = {
  title: "شحن التطبيقات",
  description: "عرض اجمالي دخل شحن التطبيقات",
};

export default async function TotalOfbalencePage() {
  await requirePagePermission("total_recharge");

  const summary = await getBalanceCharges();

  return (
    <>
      <PageHeader titleKey="sidebar.totalBalanceSales" />
      <div className="relative flex w-full flex-col overflow-hidden min-h-[calc(100dvh-14rem)]">
        <div
          className="pointer-events-none absolute -top-10 -end-16 size-60 rounded-full bg-success/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-12 -start-16 size-60 rounded-full bg-warning/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex-1">
          <BalanceTotalsView initialSummary={summary} />
        </div>
      </div>
    </>
  );
}

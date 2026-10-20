import { requirePagePermission } from "@/lib/session";
import { getWeeklyIncomeStats } from "@/lib/income/weekly";
import { PageHeader } from "@/components/dashboard/page-header";
import { IncomeSummaryView } from "@/components/income/income-summary-view";

export const metadata = {
  title: "عرض الدخل الأسبوعي",
  description: "عرض الدخل الأسبوعي",
};

export const dynamic = "force-dynamic";

export default async function WeeklyIncomePage() {
  await requirePagePermission("weekly_income");
  const stats = await getWeeklyIncomeStats();

  return (
    <>
      <PageHeader titleKey="incomeView.title" />
      <div className="relative flex w-full flex-col overflow-hidden min-h-[calc(100dvh-14rem)]">
        <div
          className="pointer-events-none absolute -top-10 -end-16 size-60 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-12 -start-16 size-60 rounded-full bg-success/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex-1">
          <IncomeSummaryView initialStats={stats} section="incomeView" />
        </div>
      </div>
    </>
  );
}

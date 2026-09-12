import { requirePagePermission } from "@/lib/session";
import { getMonthlyIncomeStats } from "@/lib/income/monthly";
import { PageHeader } from "@/components/dashboard/page-header";
import { MonthlyIncomeView } from "@/components/income/monthly-income-view";

export const metadata = {
  title: "الدخل الشهري",
  description: "عرض الدخل الشهري",
};

export default async function MonthlyIncomePage() {
  await requirePagePermission("monthly_income");

  const stats = await getMonthlyIncomeStats();

  return (
    <>
      <PageHeader titleKey="sidebar.monthlyIncome" />
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
          <MonthlyIncomeView initialStats={stats} />
        </div>
      </div>
    </>
  );
}

import { requirePagePermission } from "@/lib/session";
import { getAdvances, getEmployees } from "@/lib/advances/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdvancesView } from "@/components/advances/advances-view";

export const metadata = {
  title: "عرض السلف",
  description: "عرض السلف وإضافة سلفة جديدة",
};

export default async function ShowAdvancesPage() {
  await requirePagePermission("view_loans");

  const [summary, employees] = await Promise.all([getAdvances(), getEmployees()]);

  return (
    <>
      <PageHeader titleKey="sidebar.viewAdvances" />
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
          <AdvancesView initialSummary={summary} employees={employees} />
        </div>
      </div>
    </>
  );
}

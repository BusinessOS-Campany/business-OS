import { requirePagePermission } from "@/lib/session";
import { getExpenses } from "@/lib/expenses/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { ExpensesView } from "@/components/expenses/expenses-view";

export const metadata = {
  title: "عرض المصروفات",
  description: "عرض المصروفات وإضافة مصروف جديد",
};

export default async function ShowExpensesPage() {
  await requirePagePermission("view_expenses");

  const summary = await getExpenses();

  return (
    <>
      <PageHeader titleKey="sidebar.viewExpenses" />
      <div className="relative flex w-full flex-col overflow-hidden min-h-[calc(100dvh-14rem)]">
        <div
          className="pointer-events-none absolute -top-10 -end-16 size-60 rounded-full bg-destructive/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-12 -start-16 size-60 rounded-full bg-warning/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex-1">
          <ExpensesView initialSummary={summary} />
        </div>
      </div>
    </>
  );
}

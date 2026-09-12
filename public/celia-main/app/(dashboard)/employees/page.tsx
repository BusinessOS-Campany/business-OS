import { requirePagePermission } from "@/lib/session";
import { getEmployees } from "@/lib/employees/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmployeesView } from "@/components/employees/employees-view";

export const metadata = {
  title: "إدارة الموظفين",
  description: "إدارة الموظفين وإضافة وتعديل بياناتهم",
};

export default async function EmployeesPage() {
  await requirePagePermission("manage_roles");

  const summary = await getEmployees();

  return (
    <>
      <PageHeader titleKey="sidebar.manageEmployees" />
      <div className="relative flex w-full flex-col overflow-hidden min-h-[calc(100dvh-14rem)]">
        <div
          className="pointer-events-none absolute -top-10 -end-16 size-60 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-12 -start-16 size-60 rounded-full bg-warning/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex-1">
          <EmployeesView initialSummary={summary} />
        </div>
      </div>
    </>
  );
}

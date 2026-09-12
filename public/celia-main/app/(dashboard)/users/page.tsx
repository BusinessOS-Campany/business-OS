import { requirePagePermission } from "@/lib/session";
import { getUsers } from "@/lib/users/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { UsersView } from "@/components/users/users-view";

export const metadata = {
  title: "إدارة المستخدمين",
  description: "إدارة المستخدمين وإضافة وتعديل بياناتهم وصلاحياتهم",
};

export default async function UsersPage() {
  await requirePagePermission("manage_roles");

  const summary = await getUsers();

  return (
    <>
      <PageHeader titleKey="sidebar.manageUsers" />
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
          <UsersView initialSummary={summary} />
        </div>
      </div>
    </>
  );
}

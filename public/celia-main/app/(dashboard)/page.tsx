import { requirePagePermission } from "@/lib/session";
import { getDashboardStats } from "@/lib/dashboard/stats";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function HomePage() {
  await requirePagePermission("dashboard");
  const stats = await getDashboardStats();

  return (
    <>
      <PageHeader />
      <DashboardContent initialStats={stats} />
    </>
  );
}

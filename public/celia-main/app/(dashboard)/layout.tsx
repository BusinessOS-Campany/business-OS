import { getUserPermissions, requireUser } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const user = session.user;
  const permissions = await getUserPermissions(user.id);

  return (
    <DashboardShell user={{ name: user.name, role: user.role, permissions }}>
      {children}
    </DashboardShell>
  );
}

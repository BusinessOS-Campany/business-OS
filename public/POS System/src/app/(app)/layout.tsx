import { redirect } from "next/navigation";
import { getTenant } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();
  if (!tenant.companyId) redirect("/login");

  const unreadCount = tenant.user.id
    ? await prisma.notification.count({
        where: { companyId: tenant.companyId, userId: tenant.user.id, read: false },
      })
    : 0;

  return (
    <AppShell
      user={{
        name: tenant.user.name,
        email: tenant.user.email,
        avatar: tenant.user.avatar,
      }}
      companyName={tenant.companyName}
      permissions={[...tenant.permissions]}
      isSuperAdmin={tenant.isSuperAdmin}
      branches={tenant.branches}
      activeBranchId={tenant.branchId}
      activeBranchName={tenant.branchName}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}
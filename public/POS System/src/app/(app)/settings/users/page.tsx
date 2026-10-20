import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { UsersClient } from "@/components/settings/users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "user.manage") && !can(tenant, "settings.manage")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية إدارة المستخدمين" : "No permission to manage users"}</p>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    where: { companyId: tenant.companyId, isSuperAdmin: false },
    select: {
      id: true, name: true, username: true, email: true, phone: true, language: true, status: true,
      lastLoginAt: true,
      branch: { select: { name: true, nameAr: true } },
      roles: { select: { role: { select: { id: true, name: true, nameAr: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const roles = await prisma.role.findMany({
    where: { companyId: tenant.companyId, isSystem: false },
    select: { id: true, name: true, nameAr: true },
    orderBy: { name: "asc" },
  });

  const branches = await prisma.branch.findMany({
    where: { companyId: tenant.companyId },
    select: { id: true, name: true, nameAr: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <UsersClient
      lang={lang}
      canManage={can(tenant, "user.manage")}
      users={users.map((u) => ({
        id: u.id, name: u.name, username: u.username, email: u.email, phone: u.phone,
        language: u.language, status: u.status, lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        branchName: u.branch ? (lang === "ar" ? u.branch.nameAr || u.branch.name : u.branch.name || u.branch.nameAr) : "",
        roles: u.roles.map((r) => ({ id: r.role.id, name: lang === "ar" ? r.role.nameAr || r.role.name : r.role.name })),
      }))}
      roles={roles.map((r) => ({ id: r.id, name: lang === "ar" ? r.nameAr || r.name : r.name }))}
      branches={branches.map((b) => ({ id: b.id, name: lang === "ar" ? b.nameAr || b.name : b.name || b.nameAr }))}
      selfId={tenant.user.id}
    />
  );
}
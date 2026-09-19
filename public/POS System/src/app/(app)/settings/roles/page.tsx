import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { RolesClient } from "@/components/settings/roles-client";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "user.manage") && !can(tenant, "settings.manage")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية إدارة الأدوار" : "No permission to manage roles"}</p>
      </div>
    );
  }

  const roles = await prisma.role.findMany({
    where: { companyId: tenant.companyId },
    select: {
      id: true, name: true, nameAr: true, description: true, isSystem: true,
      permissions: { select: { permission: { select: { key: true } } } },
      _count: { select: { users: true } },
    },
    orderBy: { isSystem: "desc" },
  });

  const allPermissions = await prisma.permission.findMany({
    select: { key: true, group: true, label: true, labelAr: true },
    orderBy: [{ group: "asc" }, { label: "asc" }],
  });

  return (
    <RolesClient
      lang={lang}
      canManage={can(tenant, "user.manage")}
      roles={roles.map((r) => ({
        id: r.id, name: r.name, nameAr: r.nameAr, description: r.description,
        isSystem: r.isSystem, userCount: r._count.users,
        permissionKeys: r.permissions.map((p) => p.permission.key),
      }))}
      permissions={allPermissions.map((p) => ({
        key: p.key, group: p.group,
        label: lang === "ar" ? p.labelAr || p.label : p.label,
      }))}
    />
  );
}
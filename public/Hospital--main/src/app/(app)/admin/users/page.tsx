import { cookies } from "next/headers";
import { Users, UserCheck, ShieldCheck, KeyRound } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import {
  getUsers,
  getRoles,
  getBranches,
  getEmployeesForLink,
  getAdminStats,
} from "@/lib/services/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { UserForm } from "@/features/admin/user-form";
import { UsersTable, type UserRow } from "@/features/admin/users-table";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  await requirePermission("users");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [users, roles, branches, employees, stats] = await Promise.all([
    getUsers({ limit: 200 }),
    getRoles(),
    getBranches(),
    getEmployeesForLink(),
    getAdminStats(),
  ]);

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    nameAr: u.nameAr ?? u.nameEn ?? u.email,
    nameEn: u.nameEn ?? u.nameAr ?? "",
    email: u.email,
    username: u.username ?? "",
    roleNameAr: u.role.nameAr,
    roleNameEn: u.role.nameEn,
    branchNameAr: u.branch?.nameAr ?? "",
    branchNameEn: u.branch?.nameEn ?? "",
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader title={t("admin.users")} description={t("admin.title")} icon={<Users />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label={t("admin.users")} value={String(stats.users)} variant="primary" />
        <StatCard icon={UserCheck} label={t("admin.isActive")} value={String(stats.activeUsers)} variant="success" />
        <StatCard icon={ShieldCheck} label={t("admin.roles")} value={String(stats.roles)} variant="info" />
        <StatCard icon={KeyRound} label={t("admin.permissions")} value={String(stats.permissions)} variant="default" />
      </div>

      <UserForm
        roles={roles.map((r) => ({ id: r.id, key: r.key, nameAr: r.nameAr, nameEn: r.nameEn }))}
        branches={branches}
        employees={employees.map((e) => ({ id: e.id, employeeNo: e.employeeNo, nameAr: e.nameAr, nameEn: e.nameEn ?? e.nameAr }))}
        locale={locale}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" />
            {t("admin.users")} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.noUsers")}</p>
          ) : (
            <UsersTable rows={rows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

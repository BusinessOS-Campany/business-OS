import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getRoles } from "@/lib/services/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RolesTable, type RoleRow } from "@/features/admin/roles-table";

export const metadata = { title: "Roles" };

export default async function AdminRolesPage() {
  await requirePermission("roles");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const roles = await getRoles();

  const rows: RoleRow[] = roles.map((r) => ({
    id: r.id,
    key: r.key,
    nameAr: r.nameAr,
    nameEn: r.nameEn,
    usersCount: r._count.users,
    permissionsCount: r._count.permissions,
    isSystem: r.isSystem,
  }));

  return (
    <div className="space-y-5">
      <PageHeader title={t("admin.roles")} description={t("admin.title")} icon={<ShieldCheck />} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" />
            {t("admin.roles")} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.noRoles")}</p>
          ) : (
            <RolesTable rows={rows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

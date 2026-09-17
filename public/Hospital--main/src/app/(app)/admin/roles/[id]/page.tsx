import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ShieldCheck, ArrowLeft, Users } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getRoleById, getPermissions } from "@/lib/services/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PermissionsForm } from "@/features/admin/permissions-form";

export default async function AdminRoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("roles");
  const { id } = await params;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [role, permissions] = await Promise.all([getRoleById(id), getPermissions()]);
  if (!role) notFound();

  const selectedIds = role.permissions.map((rp) => rp.permission.id);

  return (
    <div className="space-y-5">
      <PageHeader
        title={locale === "ar" ? role.nameAr : role.nameEn}
        description={`${role.key} · ${role._count.users} ${t("admin.users")}`}
        icon={<ShieldCheck />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={role.isSystem ? "secondary" : "info"}>
              <Users className="mr-1 size-3" />
              {role._count.users}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/roles">
                <ArrowLeft className="size-4" /> {t("common.back")}
              </Link>
            </Button>
          </div>
        }
      />

      <PermissionsForm
        roleId={role.id}
        permissions={permissions.map((p) => ({ id: p.id, key: p.key, module: p.module, action: p.action }))}
        selectedIds={selectedIds}
        isSystem={role.isSystem}
      />
    </div>
  );
}

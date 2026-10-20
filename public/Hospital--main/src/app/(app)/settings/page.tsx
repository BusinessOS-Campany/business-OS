import { cookies } from "next/headers";
import { Settings as SettingsIcon, Building2, GitBranch, Stethoscope, BedDouble } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import {
  getHospitalSettings,
  getDepartments,
  getBranches,
  getSettingsStats,
} from "@/lib/services/settings";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { HospitalForm } from "@/features/settings/hospital-form";
import { DepartmentForm } from "@/features/settings/department-form";
import { DepartmentsTable, type DepartmentRow } from "@/features/settings/departments-table";
import { BranchForm } from "@/features/settings/branch-form";
import { BranchesTable, type BranchRow } from "@/features/settings/branches-table";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePermission("settings");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [settings, departments, branches, stats] = await Promise.all([
    getHospitalSettings(),
    getDepartments(),
    getBranches(),
    getSettingsStats(),
  ]);

  const deptRows: DepartmentRow[] = departments.map((d) => ({
    id: d.id,
    code: d.code,
    nameAr: d.nameAr,
    nameEn: d.nameEn,
    type: d.type,
    branchNameAr: d.branch.nameAr,
    branchNameEn: d.branch.nameEn,
    isActive: d.isActive,
  }));

  const branchRows: BranchRow[] = branches.map((b) => ({
    id: b.id,
    code: b.code,
    nameAr: b.nameAr,
    nameEn: b.nameEn,
    phone: b.phone ?? "",
    email: b.email ?? "",
    isActive: b.isActive,
  }));

  return (
    <div className="space-y-5">
      <PageHeader title={t("settings.title")} description={t("settings.general")} icon={<SettingsIcon />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Building2} label={t("settings.departments")} value={String(stats.departments)} variant="primary" />
        <StatCard icon={GitBranch} label={t("settings.branchesSettings")} value={String(stats.branches)} variant="info" />
        <StatCard icon={Stethoscope} label={t("settings.services")} value={String(stats.services)} variant="success" />
        <StatCard icon={BedDouble} label={t("settings.roomsBeds")} value={String(stats.beds)} variant="warning" />
        <StatCard icon={SettingsIcon} label={t("admin.users")} value={String(stats.users)} variant="default" />
      </div>

      <HospitalForm settings={settings} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-primary" />
            {t("settings.departments")} ({deptRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DepartmentForm branches={branches.map((b) => ({ id: b.id, nameAr: b.nameAr, nameEn: b.nameEn }))} locale={locale} />
          {deptRows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
          ) : (
            <DepartmentsTable rows={deptRows} locale={locale} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="size-4 text-primary" />
            {t("settings.branchesSettings")} ({branchRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BranchForm />
          {branchRows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
          ) : (
            <BranchesTable rows={branchRows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

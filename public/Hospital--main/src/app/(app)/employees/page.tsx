import { cookies } from "next/headers";
import { Users, UserCheck, Stethoscope, HeartPulse } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getEmployees, getEmployeeStats, departments, positions, specialties, branches } from "@/lib/services/employees";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmployeeForm } from "@/features/employees/employee-form";
import { EmployeesTable, type EmployeeRow } from "@/features/employees/employees-table";

export const metadata = { title: "Employees" };

export default async function EmployeesPage() {
  await requirePermission("employees");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [employees, stats, departmentsOpts, positionsOpts, specialtiesOpts, branchesOpts] = await Promise.all([
    getEmployees({ limit: 200 }),
    getEmployeeStats(),
    departments(),
    positions(),
    specialties(),
    branches(),
  ]);

  const rows: EmployeeRow[] = employees.map((e) => ({
    id: e.id,
    employeeNo: e.employeeNo,
    nameAr: e.nameAr,
    nameEn: e.nameEn,
    employeeType: e.employeeType,
    departmentNameAr: e.department?.nameAr ?? null,
    departmentNameEn: e.department?.nameEn ?? null,
    positionNameAr: e.position?.nameAr ?? null,
    positionNameEn: e.position?.nameEn ?? null,
    specialtyNameAr: e.specialty?.nameAr ?? null,
    specialtyNameEn: e.specialty?.nameEn ?? null,
    phone: e.phone,
    email: e.email,
    employeeStatus: e.employeeStatus,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("employees.title")}
        description={t("employees.title")}
        icon={<Users />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label={t("employees.title")} value={String(stats.total)} variant="info" />
        <StatCard icon={UserCheck} label="Active" value={String(stats.active)} variant="success" />
        <StatCard icon={Stethoscope} label={t("employees.typeDoctor")} value={String(stats.doctors)} variant="primary" />
        <StatCard icon={HeartPulse} label={t("employees.typeNurse")} value={String(stats.nurses)} variant="default" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <EmployeeForm
            locale={locale}
            departments={departmentsOpts}
            positions={positionsOpts}
            specialties={specialtiesOpts}
            branches={branchesOpts}
          />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" />
              {t("employees.title")} ({rows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("employees.addFirstEmployee")}</p>
            ) : (
              <EmployeesTable rows={rows} locale={locale} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
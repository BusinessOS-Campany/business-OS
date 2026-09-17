import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Users, ArrowLeft, User, Phone, Mail, Building2, Briefcase, GraduationCap, CalendarDays, Coins, FileText, Clock, CalendarClock, Wallet } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getEmployeeById } from "@/lib/services/employees";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeStatusActions } from "@/features/employees/employee-status-actions";
import { EmployeeDocumentForm } from "@/features/employees/employee-document-form";

const EMPLOYEE_TYPE_KEY: Record<string, string> = {
  DOCTOR: "employees.typeDoctor",
  NURSE: "employees.typeNurse",
  PHARMACIST: "employees.typePharmacist",
  LAB_TECHNICIAN: "employees.typeLabTechnician",
  RADIOLOGIST: "employees.typeRadiologist",
  RADIOLOGY_TECHNICIAN: "employees.typeOther",
  RECEPTIONIST: "employees.typeReceptionist",
  ACCOUNTANT: "employees.typeAccountant",
  CASHIER: "employees.typeCashier",
  HR: "employees.typeHR",
  ADMINISTRATOR: "employees.typeAdministrator",
  CLEANER: "employees.typeOther",
  TECHNICIAN: "employees.typeTechnician",
  AMBULANCE_STAFF: "employees.typeAmbulanceStaff",
  OTHER: "employees.typeOther",
};

const STATUS_VARIANT: Record<string, "info" | "warning" | "success" | "muted" | "destructive" | "default"> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  SUSPENDED: "muted",
  TERMINATED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
};

const EMPLOYMENT_LABEL: Record<string, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERN: "Intern",
};

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("employees");
  const { id } = await params;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB") : "—");
  const localized = (nameAr: string | null | undefined, nameEn: string | null | undefined) =>
    !nameAr && !nameEn ? "—" : locale === "ar" ? nameAr ?? nameEn! : nameEn ?? nameAr!;

  const info: Array<{ icon: typeof User; label: string; value: string }> = [
    { icon: User, label: t("employees.employeeType"), value: t(EMPLOYEE_TYPE_KEY[employee.employeeType] ?? employee.employeeType) },
    { icon: Building2, label: t("employees.department"), value: localized(employee.department?.nameAr, employee.department?.nameEn) },
    { icon: Briefcase, label: t("employees.position"), value: localized(employee.position?.nameAr, employee.position?.nameEn) },
    { icon: GraduationCap, label: t("employees.specialty"), value: localized(employee.specialty?.nameAr, employee.specialty?.nameEn) },
    { icon: Building2, label: "Branch", value: localized(employee.branch?.nameAr, employee.branch?.nameEn) },
    { icon: CalendarDays, label: t("employees.contractType"), value: EMPLOYMENT_LABEL[employee.employmentType] ?? employee.employmentType },
    { icon: CalendarDays, label: t("employees.hireDate"), value: fmtDate(employee.hireDate) },
    { icon: Coins, label: t("employees.baseSalary"), value: employee.baseSalary != null ? String(Number(employee.baseSalary)) : "—" },
    { icon: FileText, label: t("employees.licenseNo"), value: employee.licenseNo ?? "—" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={employee.employeeNo}
        description={`${locale === "ar" ? employee.nameAr : employee.nameEn}${locale === "ar" ? " · " + employee.nameEn : " · " + employee.nameAr}`}
        icon={<Users />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[employee.employeeStatus] ?? "outline"}>{STATUS_LABEL[employee.employeeStatus] ?? employee.employeeStatus}</Badge>
            <EmployeeStatusActions employeeId={employee.id} status={employee.employeeStatus} />
            <Button asChild variant="outline" size="sm">
              <Link href="/employees">
                <ArrowLeft className="size-4" /> {t("common.back")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("common.notes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{employee.note ?? "—"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />
                Documents ({employee.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {employee.documents.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No documents</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {employee.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{doc.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {doc.fileName} · {fmtDate(doc.createdAt)}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          {t("common.view")}
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <EmployeeDocumentForm employeeId={employee.id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("common.patient")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium">
                <User className="size-4 text-primary" />
                {locale === "ar" ? employee.nameAr : employee.nameEn}
              </p>
              <div className="space-y-1.5 text-muted-foreground">
                {employee.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5" /> {employee.phone}
                  </p>
                )}
                {employee.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="size-3.5" /> {employee.email}
                  </p>
                )}
                {employee.nationalId && (
                  <p className="flex items-center gap-1.5">
                    <FileText className="size-3.5" /> {employee.nationalId}
                  </p>
                )}
                {employee.address && (
                  <p className="flex items-center gap-1.5">
                    <Building2 className="size-3.5" /> {employee.address}
                  </p>
                )}
                {employee.gender && (
                  <p className="flex items-center gap-1.5">
                    <User className="size-3.5" /> {t(employee.gender === "MALE" ? "common.male" : "common.female")}
                  </p>
                )}
              </div>
              {employee.user && (
                <div className="space-y-1 border-t pt-3">
                  <p className="text-xs text-muted-foreground">{t("employees.createUser")}</p>
                  <p className="font-medium">{employee.user.email}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("employees.employeeNo")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              {info.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <row.icon className="size-3.5 shrink-0" />
                    {row.label}
                  </p>
                  <p className="text-right text-sm font-medium">{row.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4 text-primary" />
                {t("hr.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/hr">
                  <CalendarClock className="size-4" /> {t("hr.attendance")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/hr">
                  <FileText className="size-4" /> {t("hr.leave")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/payroll">
                  <Wallet className="size-4" /> {t("payroll.title")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}